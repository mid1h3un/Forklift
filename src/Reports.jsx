import React, { useState } from "react";
import jsPDF from "jspdf";
import "./Report.css";

const Report = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [running, setRunning] = useState(null);

  const getReport = async () => {
    const res = await fetch("https://www.solvexesapp.com/runtime-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime }),
    });

    const data = await res.json();
    setRunning(data);
  };

  // ------------------ PDF DOWNLOAD ------------------
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Machine Runtime Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Start Time: ${startTime}`, 20, 40);
    doc.text(`End Time:   ${endTime}`, 20, 50);
    doc.text(`Running Hours: ${(running.running_seconds/3600).toFixed(2)}`, 20, 70);

    doc.save("runtime_report.pdf");
  };

  // ------------------ CSV DOWNLOAD ------------------
  const downloadCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Field,Value",
       `Start Time,${startTime}`,
       `End Time,${endTime}`,
       `Running Hours,${(running.running_seconds/3600).toFixed(2)}`
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "runtime_report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="report-container">
      <div className="report-card">
        <h2 className="title">Device Runtime Report</h2>

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

        <button className="btn" onClick={getReport}>Get Report</button>

        {running && (
          <div className="result-box">
            <h3>Report Result</h3>
            <p><b>Running Hours:</b> {(running.running_seconds/3600).toFixed(2)}</p>
            <div className="button-row">
              <button className="btn pdf" onClick={downloadPDF}>Download PDF</button>
              <button className="btn csv" onClick={downloadCSV}>Download CSV</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
