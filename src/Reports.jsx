import React, { useState } from "react";
import jsPDF from "jspdf";
import "./Report.css";
import logo from './assets/cc.png';

const forklifts = [
  { name: "Forklift T5", imei: "867512077469365" },
  { name: "Forklift T9", imei: "865931084963206" },
  { name: "Forklift T7", imei: "865931084970326" },
  { name: "Forklift D1", imei: "865931084979863" },
  { name: "Forklift T4", imei: "865931084970615" },
  { name: "Forklift L11", imei: "862774080074088" },
  { name: "Forklift L12", imei: "862774080073668" }
];

const Report = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedImeis, setSelectedImeis] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Convert seconds to H:M:S format
  const formatRunningTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

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
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();
      
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
      
      const navbarHeight = 20;
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, navbarHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      const title = "Machine Runtime Report";
      const titleWidth = doc.getTextWidth(title);
      const centerX = (210 - titleWidth) / 2;
      const titleY = navbarHeight / 2 + 4;
      doc.text(title, centerX, titleY);
      
      const logoWidth = 25;
      const logoHeight = 13;
      const logoX = 210 - logoWidth - 10;
      const logoY = (navbarHeight - logoHeight) / 2;
      doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
      
      doc.setTextColor(0, 0, 0);
      
      const contentStartY = navbarHeight + 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Period: ${formatDateTime(startTime)} to ${formatDateTime(endTime)}`, 14, contentStartY);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, contentStartY + 6);
      
      let yPos = contentStartY + 17;
      const lineHeight = 8;
      const col1 = 14;
      const col2 = 120;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("Forklift", col1, yPos);
      doc.text("Total Running Time", col2, yPos);
      
      yPos += 2;
      doc.line(14, yPos, 195, yPos);
      yPos += 6;
      
      doc.setFont(undefined, 'normal');
      reports.forEach((report) => {
        if (yPos > 270) {
          doc.addPage();
          
          doc.setFillColor(0, 0, 0);
          doc.rect(0, 0, 210, navbarHeight, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(18);
          doc.setFont(undefined, 'bold');
          doc.text(title, centerX, titleY);
          doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
          
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(10);
          
          yPos = contentStartY;
        }
        
        doc.text(report.name, col1, yPos);
        doc.text(formatRunningTime(report.running_seconds), col2, yPos);
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
        "Forklift,IMEI,Total Running Time,Running Hours,Running Minutes,Running Seconds"
      ];

      reports.forEach(report => {
        const hours = (report.running_seconds / 3600).toFixed(2);
        const formattedTime = formatRunningTime(report.running_seconds);
        csvRows.push(
          `${report.name},${report.imei},${formattedTime},${hours},${report.running_minutes},${report.running_seconds}`
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
      <div className="report-layout">
        {/* Left Side - Input Form */}
        <div className="report-card">
          <h2 className="title">Runtime Report</h2>

          <label className="label">Select Forklifts</label>
          <div className="forklift-selector">
            <button onClick={selectAll} className="select-all-btn">
              {selectedImeis.length === forklifts.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <div className="checkbox-container">
              {forklifts.map((forklift) => (
                <label key={forklift.imei} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedImeis.includes(forklift.imei)}
                    onChange={() => handleForkliftSelection(forklift.imei)}
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

          {error && <div className="error-message">{error}</div>}

          <div className="action-buttons">
            <button className="btn" onClick={getReport} disabled={loading}>
              {loading ? "Loading..." : "Get Report"}
            </button>
            <button className="btn clear-btn" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>

        {/* Right Side - Results Panel */}
        <div className="results-panel">
          {reports.length > 0 ? (
            <div className="result-box">
              <h3>Report Results</h3>
              
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Forklift</th>
                      <th>Total Running Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => (
                      <tr key={idx}>
                        <td>{report.name}</td>
                        <td>{formatRunningTime(report.running_seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="button-row">
                <button className="btn pdf" onClick={downloadPDF}>
                  Download PDF
                </button>
                <button className="btn csv" onClick={downloadCSV}>
                  Download CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">📊</div>
              <div className="no-results-text">No Results Yet</div>
              <div className="no-results-subtext">
                Select forklifts, choose a time period, and click "Get Report" to view results here
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
