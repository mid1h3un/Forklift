import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import './Reportdashboard.css';

export default function ForkliftTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForklifts, setSelectedForklifts] = useState(['t5', 't9', 't7', 't4', 'd1']);
  const [dateRange, setDateRange] = useState('14');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dataCache, setDataCache] = useState({});
  const [lastFetchParams, setLastFetchParams] = useState(null);

  const API_URL = 'https://solvexesapp.com/runtime-report';

  const forklifts = [
    { name: "Forklift T5", imei: "867512077469365", key: "t5" },
    { name: "Forklift T9", imei: "865931084963206", key: "t9" },
    { name: "Forklift T7", imei: "865931084970326", key: "t7" },
    { name: "Forklift T4", imei: "865931084979863", key: "t4" },
    { name: "Forklift D1", imei: "865931084970615", key: "d1" }
  ];

  const generateDateRange = (days) => {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  const generateCustomDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    return dates;
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fetchForkliftData = async (imei, startTime, endTime) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imei: imei,
        startTime: startTime,
        endTime: endTime
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Server error');
    }

    return await response.json();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate cache key based on date range parameters
      const cacheKey = dateRange === 'custom' 
        ? `custom_${customStartDate}_${customEndDate}`
        : `range_${dateRange}`;

      // Check if we already have this data and parameters haven't changed
      if (dataCache[cacheKey] && lastFetchParams === cacheKey) {
        setData(dataCache[cacheKey]);
        setLoading(false);
        return;
      }

      let dates;
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        dates = generateCustomDateRange(customStartDate, customEndDate);
      } else {
        dates = generateDateRange(parseInt(dateRange));
      }

      const chartData = [];

      for (const date of dates) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const startTime = startOfDay.toISOString();
        const endTime = endOfDay.toISOString();

        const dayData = {
          date: formatDate(date)
        };

        // Create a cache key for this specific date and forklift combination
        const dateCacheKey = `${formatDate(date)}`;
        
        const promises = forklifts.map(async (forklift) => {
          const forkliftCacheKey = `${dateCacheKey}_${forklift.imei}`;
          
          // Check if we have cached data for this specific date and forklift
          if (dataCache[forkliftCacheKey] !== undefined) {
            return {
              key: forklift.key,
              hours: dataCache[forkliftCacheKey]
            };
          }

          try {
            const result = await fetchForkliftData(forklift.imei, startTime, endTime);
            const hours = result.running_hours || 0;
            
            // Cache this individual result
            setDataCache(prev => ({
              ...prev,
              [forkliftCacheKey]: hours
            }));
            
            return {
              key: forklift.key,
              hours: hours
            };
          } catch (err) {
            console.error(`Error fetching data for ${forklift.name}:`, err);
            return {
              key: forklift.key,
              hours: 0
            };
          }
        });

        const results = await Promise.all(promises);

        results.forEach(result => {
          dayData[result.key] = result.hours;
        });

        chartData.push(dayData);
      }

      // Cache the complete result
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: chartData
      }));
      
      setLastFetchParams(cacheKey);
      setData(chartData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleForkliftToggle = (forkliftKey) => {
    setSelectedForklifts(prev => {
      if (prev.includes(forkliftKey)) {
        return prev.filter(key => key !== forkliftKey);
      } else {
        return [...prev, forkliftKey];
      }
    });
  };

  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Forklift Usage Report', 14, 22);
    
    // Add date range info
    doc.setFontSize(11);
    let dateInfo = '';
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      dateInfo = `Date Range: ${customStartDate} to ${customEndDate}`;
    } else {
      dateInfo = `Date Range: Last ${dateRange} days`;
    }
    doc.text(dateInfo, 14, 32);
    
    // Prepare table data
    const tableHeaders = ['Date'];
    const selectedForkliftNames = forklifts
      .filter(f => selectedForklifts.includes(f.key))
      .map(f => f.key.toUpperCase());
    tableHeaders.push(...selectedForkliftNames);
    
    const tableData = data.map(row => {
      const rowData = [row.date];
      selectedForklifts.forEach(key => {
        rowData.push(row[key]?.toFixed(1) || '0.0');
      });
      return rowData;
    });
    
    // Add table using autoTable
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [75, 85, 99] }
    });
    
    // Add chart
    const finalY = doc.lastAutoTable.finalY || 40;
    
    // Get the chart container
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      try {
        // Use html2canvas to capture the chart with high quality
        const canvas = await html2canvas(chartContainer, {
          scale: 2, // Higher scale for better quality
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Add chart title
        doc.setFontSize(12);
        doc.text('Usage Over Time', 14, finalY + 10);
        
        // Calculate dimensions to fit the PDF
        const imgWidth = 180;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        
        // Check if we need a new page
        if (finalY + imgHeight + 20 > doc.internal.pageSize.height) {
          doc.addPage();
          doc.setFontSize(12);
          doc.text('Usage Over Time', 14, 20);
          doc.addImage(imgData, 'PNG', 14, 25, imgWidth, imgHeight);
        } else {
          doc.addImage(imgData, 'PNG', 14, finalY + 15, imgWidth, imgHeight);
        }
        
        // Save the PDF
        const fileName = `forklift-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Error adding chart to PDF:', error);
        // Save PDF without chart if there's an error
        const fileName = `forklift-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }
    } else {
      // Save PDF without chart if chart container not found
      const fileName = `forklift-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    }
  };

  if (loading) {
    return (
      <div className="container-full loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading forklift data...</p>
          <p className="loading-subtext">Fetching runtime data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-full error-container">
        <div className="error-card">
          <div className="error-title">Error Loading Data</div>
          <p className="error-message">{error}</p>
          <button onClick={fetchData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-full main-container">
      <div className="card">
        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-row">
            {/* Forklift Selection Dropdown */}
            <div className="filter-item">
              <label className="filter-label">Forklifts:</label>
              <div className="dropdown-container">
                <button 
                  className="dropdown-button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  type="button"
                >
                  <span>{selectedForklifts.length} selected</span>
                  <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                </button>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    {forklifts.map(forklift => (
                      <label key={forklift.key} className="dropdown-item">
                        <input
                          type="checkbox"
                          checked={selectedForklifts.includes(forklift.key)}
                          onChange={() => handleForkliftToggle(forklift.key)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">{forklift.key.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="filter-item">
              <label className="filter-label">Date Range:</label>
              <select 
                value={dateRange} 
                onChange={handleDateRangeChange}
                className="select-input"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Inputs */}
            {dateRange === 'custom' && (
              <>
                <div className="filter-item">
                  <label className="filter-label">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="filter-item">
                  <label className="filter-label">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </>
            )}

            {/* Apply Button */}
            <button onClick={handleApplyFilters} className="apply-button">
              Apply Filters
            </button>

            {/* Download Button */}
            <button onClick={downloadPDF} className="download-button">
              <span className="download-icon">⬇</span> Download PDF
            </button>
          </div>
        </div>

        <div className="grid-layout">
          {/* Data Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {selectedForklifts.includes('t5') && <th>T5</th>}
                  {selectedForklifts.includes('t9') && <th>T9</th>}
                  {selectedForklifts.includes('t7') && <th>T7</th>}
                  {selectedForklifts.includes('t4') && <th>T4</th>}
                  {selectedForklifts.includes('d1') && <th>D1</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="date-cell">{row.date}</td>
                    {selectedForklifts.includes('t5') && <td className="data-cell">{row.t5?.toFixed(1) || '0.0'}</td>}
                    {selectedForklifts.includes('t9') && <td className="data-cell">{row.t9?.toFixed(1) || '0.0'}</td>}
                    {selectedForklifts.includes('t7') && <td className="data-cell">{row.t7?.toFixed(1) || '0.0'}</td>}
                    {selectedForklifts.includes('t4') && <td className="data-cell">{row.t4?.toFixed(1) || '0.0'}</td>}
                    {selectedForklifts.includes('d1') && <td className="data-cell">{row.d1?.toFixed(1) || '0.0'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="chart-container">
            <h2 className="chart-title">Usage Over Time</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 9 }}
                />
                <YAxis tick={{ fontSize: 9 }} width={30} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Legend 
                  verticalAlign="bottom"
                  height={25}
                  wrapperStyle={{ paddingTop: '5px' }}
                  iconType="line"
                />
                {selectedForklifts.includes('t5') && (
                  <Line 
                    type="monotone" 
                    dataKey="t5" 
                    stroke="#ef4444" 
                    name="T5"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {selectedForklifts.includes('t9') && (
                  <Line 
                    type="monotone" 
                    dataKey="t9" 
                    stroke="#f97316" 
                    name="T9"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {selectedForklifts.includes('t7') && (
                  <Line 
                    type="monotone" 
                    dataKey="t7" 
                    stroke="#334155" 
                    name="T7"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {selectedForklifts.includes('t4') && (
                  <Line 
                    type="monotone" 
                    dataKey="t4" 
                    stroke="#3b82f6" 
                    name="T4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {selectedForklifts.includes('d1') && (
                  <Line 
                    type="monotone" 
                    dataKey="d1" 
                    stroke="#10b981" 
                    name="D1"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}