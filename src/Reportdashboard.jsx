import { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import './Reportdashboard.css';

export default function ForkliftTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForklifts, setSelectedForklifts] = useState(['t5', 't9', 't7', 't4', 'd1', 'l11', 'l12', 't8', 'd4', 't1']);
  const [dateRange, setDateRange] = useState('14');
  const [customStartDateTime, setCustomStartDateTime] = useState('');
  const [customEndDateTime, setCustomEndDateTime] = useState('');
  const [shiftReportDate, setShiftReportDate] = useState('');
  const [shiftData, setShiftData] = useState(null);
  const [totalDayData, setTotalDayData] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [dataCache, setDataCache] = useState({});
  const [lastFetchParams, setLastFetchParams] = useState(null);
  const [maximizedGraph, setMaximizedGraph] = useState(null); // null, 'total', 'shiftA', 'shiftB', 'shiftC'

  const API_URL = 'https://solvexesapp.com/runtime-report';

  const forklifts = [
    { name: "Forklift T5", imei: "867512077469365", key: "t5" },
    { name: "Forklift T9", imei: "865931084963206", key: "t9" },
    { name: "Forklift T7", imei: "865931084970326", key: "t7" },
    { name: "Forklift D1", imei: "865931084979863", key: "d1" },
    { name: "Forklift T4", imei: "865931084970615", key: "t4" },
    { name: "Forklift L11", imei: "862774080074088", key: "l11" },
    { name: "Forklift L12", imei: "862774080073668", key: "l12" },
    { name: "Forklift T8", imei: "862774080051581", key: "t8" },
    { name: "Forklift D4", imei: "862774080074161", key: "d4" },
    { name: "Forklift T1", imei: "862774080072280", key: "t1" }
  ];

  const shifts = [
    { name: 'Shift A', startHour: 6, endHour: 14, label: '6 AM - 2 PM' },
    { name: 'Shift B', startHour: 14, endHour: 22, label: '2 PM - 10 PM' },
    { name: 'Shift C', startHour: 22, endHour: 6, label: '10 PM - 6 AM', crossesMidnight: true }
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

  const generateCustomDateRange = (startDateTime, endDateTime) => {
    const dates = [];
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    const startHour = start.getHours();
    const currentDate = new Date(start);
    currentDate.setHours(startHour, 0, 0, 0);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
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

  const fetchShiftData = async () => {
    if (!shiftReportDate) {
      alert('Please select a date for shift report');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedDate = new Date(shiftReportDate);
      const shiftResults = [];

      // Fetch shift-wise data
      for (const shift of shifts) {
        let startTime, endTime;

        if (shift.crossesMidnight) {
          startTime = new Date(selectedDate);
          startTime.setHours(shift.startHour, 0, 0, 0);

          endTime = new Date(selectedDate);
          endTime.setDate(endTime.getDate() + 1);
          endTime.setHours(shift.endHour, 0, 0, 0);
        } else {
          startTime = new Date(selectedDate);
          startTime.setHours(shift.startHour, 0, 0, 0);

          endTime = new Date(selectedDate);
          endTime.setHours(shift.endHour, 0, 0, 0);
        }

        const shiftData = {
          shift: shift.name,
          label: shift.label
        };

        const promises = forklifts.map(async (forklift) => {
          try {
            const result = await fetchForkliftData(
              forklift.imei,
              startTime.toISOString(),
              endTime.toISOString()
            );
            return {
              key: forklift.key,
              hours: result.running_hours || 0
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
          shiftData[result.key] = result.hours;
        });

        shiftResults.push(shiftData);
      }

      setShiftData(shiftResults);

      // Fetch total day data (6 AM to 6 AM next day)
      const dayStartTime = new Date(selectedDate);
      dayStartTime.setHours(6, 0, 0, 0);
      
      const dayEndTime = new Date(selectedDate);
      dayEndTime.setDate(dayEndTime.getDate() + 1);
      dayEndTime.setHours(5, 59, 59, 999);

      const totalData = {
        label: 'Total Day (6 AM - 6 AM)'
      };

      const dayPromises = forklifts.map(async (forklift) => {
        try {
          const result = await fetchForkliftData(
            forklift.imei,
            dayStartTime.toISOString(),
            dayEndTime.toISOString()
          );
          return {
            key: forklift.key,
            hours: result.running_hours || 0
          };
        } catch (err) {
          console.error(`Error fetching total day data for ${forklift.name}:`, err);
          return {
            key: forklift.key,
            hours: 0
          };
        }
      });

      const dayResults = await Promise.all(dayPromises);
      dayResults.forEach(result => {
        totalData[result.key] = result.hours;
      });

      setTotalDayData([totalData]);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching shift data:', err);
      setLoading(false);
    }
  };

  const calculateTrendLine = (chartData) => {
    if (!chartData || chartData.length === 0) return chartData;

    const dataWithTrend = chartData.map((item, index) => {
      let sum = 0;
      let count = 0;
      
      selectedForklifts.forEach(key => {
        if (item[key] !== undefined && item[key] !== null) {
          sum += item[key];
          count++;
        }
      });
      
      const average = count > 0 ? sum / count : 0;
      
      return {
        ...item,
        average: average,
        index: index
      };
    });

    const n = dataWithTrend.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    dataWithTrend.forEach((item, index) => {
      sumX += index;
      sumY += item.average;
      sumXY += index * item.average;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return dataWithTrend.map((item, index) => ({
      ...item,
      trend: slope * index + intercept
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = dateRange === 'custom' 
        ? `custom_${customStartDateTime}_${customEndDateTime}`
        : `range_${dateRange}`;

      if (dataCache[cacheKey] && lastFetchParams === cacheKey) {
        const cachedData = dataCache[cacheKey];
        setData(calculateTrendLine(cachedData));
        setLoading(false);
        return;
      }

      let dates;
      let isCustomRange = dateRange === 'custom' && customStartDateTime && customEndDateTime;
      
      if (isCustomRange) {
        dates = generateCustomDateRange(customStartDateTime, customEndDateTime);
      } else {
        dates = generateDateRange(parseInt(dateRange));
      }

      const chartData = [];

      for (const date of dates) {
        let startOfDay, endOfDay;
        
        if (isCustomRange) {
          const startDT = new Date(customStartDateTime);
          const endDT = new Date(customEndDateTime);
          
          startOfDay = new Date(date);
          startOfDay.setHours(startDT.getHours(), startDT.getMinutes(), 0, 0);
          
          const isLastDate = date.toDateString() === new Date(customEndDateTime).toDateString();
          
          if (isLastDate) {
            endOfDay = new Date(customEndDateTime);
          } else {
            endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
          }
        } else {
          startOfDay = new Date(date);
          startOfDay.setHours(6, 0, 0, 0);
          
          endOfDay = new Date(date);
          endOfDay.setDate(endOfDay.getDate() + 1);
          endOfDay.setHours(5, 59, 59, 999);
        }

        const startTime = startOfDay.toISOString();
        const endTime = endOfDay.toISOString();

        const dayData = {
          date: formatDate(date)
        };

        const dateCacheKey = `${formatDate(date)}_${startTime}_${endTime}`;
        
        const promises = forklifts.map(async (forklift) => {
          const forkliftCacheKey = `${dateCacheKey}_${forklift.imei}`;
          
          if (dataCache[forkliftCacheKey] !== undefined) {
            return {
              key: forklift.key,
              hours: dataCache[forkliftCacheKey]
            };
          }

          try {
            const result = await fetchForkliftData(forklift.imei, startTime, endTime);
            const hours = result.running_hours || 0;
            
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

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: chartData
      }));
      
      setLastFetchParams(cacheKey);
      setData(calculateTrendLine(chartData));
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

  useEffect(() => {
    if (data.length > 0) {
      setData(prevData => calculateTrendLine(prevData));
    }
  }, [selectedForklifts, showTrendLine]);

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
    const value = e.target.value;
    setDateRange(value);
    
    if (value !== 'shift') {
      setShiftData(null);
      setTotalDayData(null);
      setShiftReportDate('');
    }
  };

  const handleApplyFilters = () => {
    if (dateRange === 'shift') {
      fetchShiftData();
    } else {
      setShiftData(null);
      setTotalDayData(null);
      fetchData();
    }
  };

  const renderShiftChart = (shiftData, isMaximized = false) => {
    const fontSize = isMaximized ? { axis: 14, label: 11 } : { axis: 10, label: 9 };
    const margin = isMaximized 
      ? { top: 40, right: 30, left: 10, bottom: 50 }
      : { top: 20, right: 10, left: -10, bottom: 35 };
    
    // Transform data to have separate entries for each forklift
    const transformedData = selectedForklifts.map(key => ({
      forklift: key.toUpperCase(),
      hours: shiftData[key] || 0,
      color: {
        't5': '#ef4444',
        't9': '#f97316',
        't7': '#334155',
        't4': '#3b82f6',
        'd1': '#10b981',
        'l11': '#8b5cf6',
        'l12': '#ec4899',
        't8': '#14b8a6',
        'd4': '#f59e0b',
        't1': '#6366f1'
      }[key]
    }));
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={transformedData} 
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="forklift"
            tick={{ fontSize: fontSize.axis, fontWeight: 'bold' }}
          />
          <YAxis tick={{ fontSize: fontSize.axis }} width={isMaximized ? 50 : 30} />
          <Bar dataKey="hours" fill="#8884d8">
            {transformedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList 
              dataKey="hours" 
              position="top" 
              style={{ fontSize: `${fontSize.label}px`, fill: '#374151', fontWeight: 'bold' }} 
              formatter={(value) => value?.toFixed(1)} 
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const renderTotalChart = (isMaximized = false) => {
    const fontSize = isMaximized ? { axis: 14, label: 11 } : { axis: 11, label: 10 };
    const margin = isMaximized 
      ? { top: 40, right: 30, left: 10, bottom: 50 }
      : { top: 30, right: 20, left: 0, bottom: 35 };
    
    // Transform data to have separate entries for each forklift
    const transformedData = selectedForklifts.map(key => ({
      forklift: key.toUpperCase(),
      hours: totalDayData[0][key] || 0,
      color: {
        't5': '#ef4444',
        't9': '#f97316',
        't7': '#334155',
        't4': '#3b82f6',
        'd1': '#10b981',
        'l11': '#8b5cf6',
        'l12': '#ec4899',
        't8': '#14b8a6',
        'd4': '#f59e0b',
        't1': '#6366f1'
      }[key]
    }));
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={transformedData} 
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="forklift"
            tick={{ fontSize: fontSize.axis, fontWeight: 'bold' }}
          />
          <YAxis tick={{ fontSize: fontSize.axis }} width={isMaximized ? 50 : 35} />
          <Bar dataKey="hours" fill="#8884d8">
            {transformedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList 
              dataKey="hours" 
              position="top" 
              style={{ fontSize: `${fontSize.label}px`, fill: '#374151', fontWeight: 'bold' }} 
              formatter={(value) => value?.toFixed(1)} 
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // Helper function to render charts into a temporary container for PDF
  const renderChartToCanvas = async (chartData, isTotal = false) => {
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '1200px';
    tempContainer.style.height = '600px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.backgroundColor = '#ffffff';
    document.body.appendChild(tempContainer);

    // Import React DOM dynamically
    const ReactDOM = await import('react-dom/client');
    const root = ReactDOM.createRoot(tempContainer);
    
    return new Promise((resolve, reject) => {
      try {
        // Render the maximized version of the chart
        const chartElement = isTotal ? renderTotalChart(true) : renderShiftChart(chartData, true);
        
        root.render(chartElement);
        
        // Wait for the chart to render
        setTimeout(async () => {
          try {
            const canvas = await html2canvas(tempContainer, {
              scale: 3,
              backgroundColor: '#ffffff',
              logging: false,
              useCORS: true,
              width: 1200,
              height: 600
            });
            
            // Cleanup
            root.unmount();
            document.body.removeChild(tempContainer);
            
            resolve(canvas);
          } catch (error) {
            root.unmount();
            document.body.removeChild(tempContainer);
            reject(error);
          }
        }, 300); // Increased timeout to ensure recharts renders
      } catch (error) {
        root.unmount();
        document.body.removeChild(tempContainer);
        reject(error);
      }
    });
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Forklift Usage Report', 14, 22);
    
    // Add date range info
    doc.setFontSize(11);
    let dateInfo = '';
    if (dateRange === 'shift' && shiftReportDate) {
      const selectedDate = new Date(shiftReportDate);
      dateInfo = `Shift Report for: ${selectedDate.toLocaleDateString()}`;
    } else if (dateRange === 'custom' && customStartDateTime && customEndDateTime) {
      const startDT = new Date(customStartDateTime);
      const endDT = new Date(customEndDateTime);
      dateInfo = `Date Range: ${startDT.toLocaleString()} to ${endDT.toLocaleString()}`;
    } else {
      dateInfo = `Date Range: Last ${dateRange} days (6 AM to 6 AM)`;
    }
    doc.text(dateInfo, 14, 32);
    
    if (dateRange === 'shift' && shiftData && totalDayData) {
      // Generate shift report PDF with maximized graphs
      try {
        let yPosition = 40;
        
        // Add Total Day Report (Full Width) with maximized graph
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Total Forklift Run Hours (6 AM - 6 AM)', 14, yPosition);
        doc.setFont(undefined, 'normal');
        yPosition += 10;
        
        try {
          // Render maximized total chart
          const canvas = await renderChartToCanvas(totalDayData[0], true);
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 180;
          const imgHeight = (canvas.height / canvas.width) * imgWidth;
          
          doc.addImage(imgData, 'PNG', 14, yPosition, imgWidth, Math.min(imgHeight, 100));
          yPosition += Math.min(imgHeight, 100) + 10;
        } catch (error) {
          console.error('Error capturing total day chart:', error);
        }
        
        // Add table for total day data
        const totalData = totalDayData[0];
        const totalTableHeaders = ['Forklift', 'Hours'];
        const totalTableData = selectedForklifts.map(key => {
          const forklift = forklifts.find(f => f.key === key);
          return [forklift.key.toUpperCase(), totalData[key]?.toFixed(1) || '0.0'];
        });
        
        autoTable(doc, {
          head: [totalTableHeaders],
          body: totalTableData,
          startY: yPosition,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // Check if we need a new page
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Add Shift Breakdown Title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Shift Wise Forklift Utilization', 14, yPosition);
        doc.setFont(undefined, 'normal');
        yPosition += 10;
        
        // Add three shift reports with side-by-side layout using maximized graphs
        for (let i = 0; i < shiftData.length; i++) {
          const shift = shiftData[i];
          
          // Check if we need a new page
          if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Add shift title
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(`${shift.shift} (${shift.label})`, 14, yPosition);
          doc.setFont(undefined, 'normal');
          yPosition += 8;
          
          // Define layout columns - table on left, chart on right
          const leftColumnX = 14;
          const rightColumnX = 85;
          const tableWidth = 60;
          const chartWidth = 110;
          
          // Prepare table data
          const tableHeaders = ['Forklift', 'Hours'];
          const tableData = selectedForklifts.map(key => {
            const forklift = forklifts.find(f => f.key === key);
            return [forklift.key.toUpperCase(), shift[key]?.toFixed(1) || '0.0'];
          });
          
          // Add table in left column
          autoTable(doc, {
            head: [tableHeaders],
            body: tableData,
            startY: yPosition,
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [75, 85, 99] },
            margin: { left: leftColumnX },
            tableWidth: tableWidth
          });
          
          const tableEndY = doc.lastAutoTable.finalY;
          
          // Capture and add maximized chart in right column
          try {
            const canvas = await renderChartToCanvas(shift, false);
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = chartWidth;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;
            
            // Add chart image in right column
            doc.addImage(imgData, 'PNG', rightColumnX, yPosition, imgWidth, Math.min(imgHeight, 80));
          } catch (error) {
            console.error(`Error capturing chart for ${shift.shift}:`, error);
          }
          
          // Position for next shift
          yPosition = Math.max(tableEndY, yPosition + 85) + 5;
          
          // Add separator line
          if (i < shiftData.length - 1) {
            doc.setDrawColor(229, 231, 235);
            doc.line(14, yPosition, 196, yPosition);
            yPosition += 8;
          }
        }
        
        // Save the PDF
        const fileName = `forklift-shift-report-${shiftReportDate}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error('Error generating shift report PDF:', error);
        alert('Error generating PDF. Please try again.');
      }
    } else {
      // Original PDF generation for regular reports
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
      
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [75, 85, 99] }
      });
      
      const finalY = doc.lastAutoTable.finalY || 40;
      
      const chartContainer = document.querySelector('.chart-container');
      if (chartContainer) {
        try {
          const canvas = await html2canvas(chartContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
          });
          
          const imgData = canvas.toDataURL('image/png');
          
          doc.setFontSize(12);
          doc.text('Usage Over Time', 14, finalY + 10);
          
          const imgWidth = 180;
          const imgHeight = (canvas.height / canvas.width) * imgWidth;
          
          if (finalY + imgHeight + 20 > doc.internal.pageSize.height) {
            doc.addPage();
            doc.setFontSize(12);
            doc.text('Usage Over Time', 14, 20);
            doc.addImage(imgData, 'PNG', 14, 25, imgWidth, imgHeight);
          } else {
            doc.addImage(imgData, 'PNG', 14, finalY + 15, imgWidth, imgHeight);
          }
          
          const fileName = `forklift-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
          doc.save(fileName);
        } catch (error) {
          console.error('Error adding chart to PDF:', error);
          const fileName = `forklift-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
          doc.save(fileName);
        }
      } else {
        const fileName = `forklift-usage-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }
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
                <option value="shift">Shift Report</option>
              </select>
            </div>

            {/* Custom Date Inputs */}
            {dateRange === 'custom' && (
              <>
                <div className="filter-item">
                  <label className="filter-label">From:</label>
                  <input
                    type="datetime-local"
                    value={customStartDateTime}
                    onChange={(e) => setCustomStartDateTime(e.target.value)}
                    className="datetime-input"
                  />
                </div>
                <div className="filter-item">
                  <label className="filter-label">To:</label>
                  <input
                    type="datetime-local"
                    value={customEndDateTime}
                    onChange={(e) => setCustomEndDateTime(e.target.value)}
                    className="datetime-input"
                  />
                </div>
              </>
            )}

            {/* Shift Report Date Input */}
            {dateRange === 'shift' && (
              <div className="filter-item">
                <label className="filter-label">Select Date:</label>
                <input
                  type="date"
                  value={shiftReportDate}
                  onChange={(e) => setShiftReportDate(e.target.value)}
                  className="datetime-input"
                />
              </div>
            )}

            {/* Apply Button */}
            <button onClick={handleApplyFilters} className="apply-button">
              Apply Filters
            </button>

            {/* Download Button */}
            <button onClick={downloadPDF} className="download-button">
              <span className="download-icon">📄</span> Download PDF
            </button>
          </div>
        </div>

        {/* Render either shift reports or regular view */}
        {dateRange === 'shift' && shiftData && totalDayData ? (
          <div className="shift-reports-container">
            <div className={`shift-layout ${maximizedGraph ? 'blurred' : ''}`}>
              {/* Left Side - Total Day Graph (Large) */}
              <div className="total-section">
                <div 
                  className="total-day-card clickable-graph" 
                  onClick={() => setMaximizedGraph('total')}
                >
                  {/* Total Day Chart */}
                  <div className="total-chart">
                    {renderTotalChart(false)}
                  </div>
                </div>
              </div>

              {/* Right Side - Shift Breakdown (3 stacked graphs) */}
              <div className="shifts-column">
                {shifts.map((shift, shiftIndex) => {
                  const currentShiftData = shiftData[shiftIndex];
                  const shiftId = shift.name.toLowerCase().replace(' ', '');
                  
                  return (
                    <div key={shift.name} className="shift-card-small clickable-graph" onClick={() => setMaximizedGraph(shiftId)}>
                      {/* Small Shift Label */}
                      <div className="shift-label-small">
                        {shift.name} <span className="shift-time-small">({shift.label})</span>
                      </div>
                      
                      {/* Shift Chart */}
                      <div className="shift-chart-small">
                        {renderShiftChart(currentShiftData, false)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal for Maximized Graph */}
            {maximizedGraph && (
              <div className="graph-modal-overlay" onClick={() => setMaximizedGraph(null)}>
                <div className="graph-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close-btn" onClick={() => setMaximizedGraph(null)}>
                    ✕
                  </button>
                  
                  {maximizedGraph === 'total' && (
                    <div className="modal-graph-container">
                      <h3 className="modal-graph-title">Total Forklift Run Hours (6 AM - 6 AM)</h3>
                      <div className="modal-chart">
                        {renderTotalChart(true)}
                      </div>
                    </div>
                  )}
                  
                  {maximizedGraph === 'shifta' && shiftData[0] && (
                    <div className="modal-graph-container">
                      <h3 className="modal-graph-title">Shift A (6 AM - 2 PM)</h3>
                      <div className="modal-chart">
                        {renderShiftChart(shiftData[0], true)}
                      </div>
                    </div>
                  )}
                  
                  {maximizedGraph === 'shiftb' && shiftData[1] && (
                    <div className="modal-graph-container">
                      <h3 className="modal-graph-title">Shift B (2 PM - 10 PM)</h3>
                      <div className="modal-chart">
                        {renderShiftChart(shiftData[1], true)}
                      </div>
                    </div>
                  )}
                  
                  {maximizedGraph === 'shiftc' && shiftData[2] && (
                    <div className="modal-graph-container">
                      <h3 className="modal-graph-title">Shift C (10 PM - 6 AM)</h3>
                      <div className="modal-chart">
                        {renderShiftChart(shiftData[2], true)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
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
                    {selectedForklifts.includes('l11') && <th>L11</th>}
                    {selectedForklifts.includes('l12') && <th>L12</th>}
                    {selectedForklifts.includes('t8') && <th>T8</th>}
                    {selectedForklifts.includes('d4') && <th>D4</th>}
                    {selectedForklifts.includes('t1') && <th>T1</th>}
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
                      {selectedForklifts.includes('l11') && <td className="data-cell">{row.l11?.toFixed(1) || '0.0'}</td>}
                      {selectedForklifts.includes('l12') && <td className="data-cell">{row.l12?.toFixed(1) || '0.0'}</td>}
                      {selectedForklifts.includes('t8') && <td className="data-cell">{row.t8?.toFixed(1) || '0.0'}</td>}
                      {selectedForklifts.includes('d4') && <td className="data-cell">{row.d4?.toFixed(1) || '0.0'}</td>}
                      {selectedForklifts.includes('t1') && <td className="data-cell">{row.t1?.toFixed(1) || '0.0'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chart */}
            <div className="chart-container">
              <div className="chart-header">
                <h2 className="chart-title">Usage Over Time</h2>
                
                {/* Trend Line Toggle */}
                <div className="trend-toggle">
                  <label className="trend-toggle-label">
                    <input
                      type="checkbox"
                      checked={showTrendLine}
                      onChange={() => setShowTrendLine(!showTrendLine)}
                      className="checkbox-input"
                    />
                    <span className="trend-toggle-text">Show Trend Line</span>
                  </label>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={data} margin={{ top: 5, right: 15, left: -5, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={50}
                    tick={{ fontSize: 8 }}
                  />
                  <YAxis tick={{ fontSize: 8 }} width={28} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Legend 
                    verticalAlign="bottom"
                    height={20}
                    wrapperStyle={{ paddingTop: '3px', fontSize: '9px' }}
                    iconSize={8}
                  />
                  {selectedForklifts.includes('t5') && (
                    <Bar 
                      dataKey="t5" 
                      fill="#ef4444" 
                      name="T5"
                    />
                  )}
                  {selectedForklifts.includes('t9') && (
                    <Bar 
                      dataKey="t9" 
                      fill="#f97316" 
                      name="T9"
                    />
                  )}
                  {selectedForklifts.includes('t7') && (
                    <Bar 
                      dataKey="t7" 
                      fill="#334155" 
                      name="T7"
                    />
                  )}
                  {selectedForklifts.includes('t4') && (
                    <Bar 
                      dataKey="t4" 
                      fill="#3b82f6" 
                      name="T4"
                    />
                  )}
                  {selectedForklifts.includes('d1') && (
                    <Bar 
                      dataKey="d1" 
                      fill="#10b981" 
                      name="D1"
                    />
                  )}
                  {selectedForklifts.includes('l11') && (
                    <Bar 
                      dataKey="l11" 
                      fill="#8b5cf6" 
                      name="L11"
                    />
                  )}
                  {selectedForklifts.includes('l12') && (
                    <Bar 
                      dataKey="l12" 
                      fill="#ec4899" 
                      name="L12"
                    />
                  )}
                  {selectedForklifts.includes('t8') && (
                    <Bar 
                      dataKey="t8" 
                      fill="#14b8a6" 
                      name="T8"
                    />
                  )}
                  {selectedForklifts.includes('d4') && (
                    <Bar 
                      dataKey="d4" 
                      fill="#f59e0b" 
                      name="D4"
                    />
                  )}
                  {selectedForklifts.includes('t1') && (
                    <Bar 
                      dataKey="t1" 
                      fill="#6366f1" 
                      name="T1"
                    />
                  )}
                  {showTrendLine && (
                    <Line 
                      type="monotone" 
                      dataKey="trend" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      dot={false}
                      name="Trend"
                      strokeDasharray="5 5"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
