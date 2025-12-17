import React, { useState } from "react";
import jsPDF from "jspdf";
import "./Report.css";
import logo from './assets/cc.png';
// Then use: doc.addImage(logo, 'PNG', 14, 5, 30, 20);
const forklifts = [
  { name: "Forklift 1", imei: "867512077469365" },
  { name: "Forklift 2", imei: "865931084963206" },
  { name: "Forklift 3", imei: "865931084970326" },
  { name: "Forklift 4", imei: "865931084979863" },
  { name: "Forklift 5", imei: "865931084970615" }
];

const Report = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedImeis, setSelectedImeis] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleForkliftSelection = (imei) => {
    setSelectedImeis(prev => {
      if (prev.includes(imei)) {
        return prev.filter(i => i !== imei);
      } else {
        return [...prev, imei];
      }
    });
  };

  const selectAll = () => {
    if (selectedImeis.length === forklifts.length) {
      setSelectedImeis([]);
    } else {
      setSelectedImeis(forklifts.map(f => f.imei));
    }
  };

  const clearAll = () => {
    setStartTime("");
    setEndTime("");
    setSelectedImeis([]);
    setReports([]);
    setError("");
  };

  const validateInputs = () => {
    if (!startTime || !endTime) {
      setError("Please select start time and end time.");
      return false;
    }

    if (selectedImeis.length === 0) {
      setError("Please select at least one forklift.");
      return false;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError("End time must be after start time.");
      return false;
    }

    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      setError("Date range cannot exceed 90 days.");
      return false;
    }

    setError("");
    return true;
  };

  const getReport = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setReports([]);

    try {
      // Convert datetime-local to ISO string with timezone
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();
      
      console.log('Sending timestamps:', { startISO, endISO });

      const fetchPromises = selectedImeis.map(async (imei) => {
        const res = await fetch("https://solvexesapp.com/runtime-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            startTime: startISO, 
            endTime: endISO, 
            imei 
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Server error");
        }

        const data = await res.json();
        const forklift = forklifts.find(f => f.imei === imei);
        
        return {
          ...data,
          name: forklift?.name || "Unknown",
          imei: imei
        };
      });

      const results = await Promise.all(fetchPromises);
      setReports(results);

      if (results.every(r => r.data_points === 0)) {
        setError("No running data found for any selected forklift in the time period.");
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(error.message || "Failed to fetch reports. Please try again.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    return new Date(dateTimeStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadPDF = () => {
    if (reports.length === 0) return;

try {
  const doc = new jsPDF();
  
  // Add black navbar background
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 20, 'F'); // Full width navbar
  
  // Add "Machine Runtime Report" title centered in navbar
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  const title = "Machine Runtime Report";
  const titleWidth = doc.getTextWidth(title);
  const centerX = (210 - titleWidth) / 2; // Center on page
  doc.text(title, centerX, 18);
  
  // Add logo on the right side of navbar
  const logoData = 'data:image/png;base64,YOUR_BASE64_STRING_HERE';
  const logoWidth = 30;
  const logoHeight = 20;
  const logoX = 210 - logoWidth - 10; // 10mm margin from right edge
  const logoY = 2; // 5mm from top
  doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
  
  // Reset text color for rest of document
  doc.setTextColor(0, 0, 0);
  
  // Report details - starts below navbar
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Period: ${formatDateTime(startTime)} to ${formatDateTime(endTime)}`, 14, 40);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 46);
  
  // Table headers
  let yPos = 63;
  const lineHeight = 8;
  const col1 = 14;
  const col2 = 100;
  const col3 = 160;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text("Forklift", col1, yPos);
  doc.text("Running Hours", col2, yPos);
  doc.text("Running Minutes", col3, yPos);
  
  yPos += 2;
  doc.line(14, yPos, 195, yPos);
  yPos += 6;
  
  // Table data
  doc.setFont(undefined, 'normal');
  reports.forEach((report) => {
    if (yPos > 270) {
      doc.addPage();
      
      // Add navbar to new page
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 30, 'F');
      
      // Center title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      const titleWidth = doc.getTextWidth(title);
      const centerX = (210 - titleWidth) / 2;
      doc.text(title, centerX, 18);
      
      // Logo on right
      doc.addImage(logoData, 'PNG', logoX, logoY, logoWidth, logoHeight);
      
      // Reset for table content
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      yPos = 40; // Start below navbar on new page
    }
    
    doc.text(report.name, col1, yPos);
    doc.text((report.running_seconds / 3600).toFixed(2), col2, yPos);
    doc.text(report.running_minutes.toFixed(2), col3, yPos);
    yPos += lineHeight;
  });

  doc.save(`runtime_report_${Date.now()}.pdf`);
} catch (error) {
  console.error("Error generating PDF:", error);
  alert("Failed to generate PDF. Please try again.");
}
  };

  const downloadCSV = () => {
    if (reports.length === 0) return;

    try {
      const csvRows = [
        "Machine Runtime Report",
        `Period: ${formatDateTime(startTime)} - ${formatDateTime(endTime)}`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        "Forklift,IMEI,Running Hours,Running Minutes"
      ];

      reports.forEach(report => {
        const hours = (report.running_seconds / 3600).toFixed(2);
        csvRows.push(
          `${report.name},${report.imei},${hours},${report.running_minutes}`
        );
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = `runtime_report_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Failed to generate CSV. Please try again.");
    }
  };

  return (
    <div className="report-container">
      <div className="report-card">
        <h2 className="title">Device Runtime Report</h2>

        <label className="label">Select Forklifts</label>
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={selectAll}
            style={{
              padding: '8px 16px',
              marginBottom: '10px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {selectedImeis.length === forklifts.length ? 'Deselect All' : 'Select All'}
          </button>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {forklifts.map((forklift) => (
              <label 
                key={forklift.imei}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedImeis.includes(forklift.imei)}
                  onChange={() => handleForkliftSelection(forklift.imei)}
                  style={{ marginRight: '10px', cursor: 'pointer' }}
                />
                <span>{forklift.name}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="label">Start Time</label>
        <input
          type="datetime-local"
          className="input"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <label className="label">End Time</label>
        <input
          type="datetime-local"
          className="input"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />

        {error && (
          <div style={{ 
            color: '#e74c3c', 
            padding: '10px', 
            marginTop: '10px',
            backgroundColor: '#fadbd8',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}

        <button className="btn" onClick={getReport} disabled={loading}>
          {loading ? "Loading..." : "Get Report"}
        </button>

        {(reports.length > 0 || startTime || endTime || selectedImeis.length > 0) && (
          <button 
            className="btn" 
            onClick={clearAll}
            style={{
              backgroundColor: '#e74c3c',
              marginTop: '10px'
            }}
          >
            Clear All
          </button>
        )}

        {reports.length > 0 && (
          <div className="result-box">
            <h3>Report Results</h3>
            
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              overflowX: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                marginTop: '0'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Forklift</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Running Hours</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Running Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{report.name}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {(report.running_seconds / 3600).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {report.running_minutes.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="button-row" style={{ marginTop: '20px' }}>
              <button className="btn pdf" onClick={downloadPDF}>
                Download PDF
              </button>
              <button className="btn csv" onClick={downloadCSV}>
                Download CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
