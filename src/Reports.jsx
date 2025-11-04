import React, { useEffect, useState } from "react";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const allTags = ["Tank A", "Tank B", "Tank C", "Pressure", "Temperature", "Flow", "TT1", "TT2", "TT3", "TT4", "LT1", "LT2", "LT3"];

export default function Reports() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tags, setTags] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const before = new Date(now.getTime() - 60 * 60 * 1000);
    setEnd(now.toISOString().slice(0, 16));
    setStart(before.toISOString().slice(0, 16));
  }, []);

  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const validateInputs = () => {
    if (!start || !end) {
      setError("Please select both start and end times");
      return false;
    }
    if (tags.length === 0) {
      setError("Please select at least one tag");
      return false;
    }
    if (new Date(start) >= new Date(end)) {
      setError("Start time must be before end time");
      return false;
    }
    setError("");
    return true;
  };

  const fetchReport = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("http://127.0.0.1:5000/api/report/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          tags,
          exportPDF: false,
        }),
      });

      const json = await res.json();
      
      if (res.ok) {
        if (json.message) {
          setError(json.message);
          setData([]);
        } else {
          setData(formatData(json));
        }
      } else {
        setError(json.error || json.message || "Error fetching report");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Network error: ${err.message}. Make sure the backend is running on http://localhost:5000`);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("http://localhost:5000/api/report/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          tags,
          exportPDF: true,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || json.message || "Failed to download PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      setError(`Failed to download PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatData = (json) => {
    if (!Array.isArray(json) || json.length === 0) return [];
    
    return json.map((d) => {
      const formatted = {
        Time: new Date(d.timestamp).toLocaleTimeString(),
        timestamp: d.timestamp,
      };
      
      // Add all tag values
      tags.forEach(tag => {
        formatted[tag] = d[tag] !== undefined ? d[tag] : null;
      });
      
      return formatted;
    });
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1400 }}>
      <h2 style={{ marginBottom: 20 }}>Custom Reports</h2>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: 6,
          color: "#c33"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Report Selection */}
      <section style={{ 
        marginBottom: 20, 
        padding: 16, 
        border: "1px solid #ddd", 
        borderRadius: 8,
        backgroundColor: "#f9f9f9"
      }}>
        <h3 style={{ marginTop: 0 }}>Generate Custom Report</h3>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong>Start Time:</strong>
            <input 
              type="datetime-local" 
              value={start} 
              onChange={(e) => setStart(e.target.value)}
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
          </label>
          
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong>End Time:</strong>
            <input 
              type="datetime-local" 
              value={end} 
              onChange={(e) => setEnd(e.target.value)}
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
          </label>

          {/* Dropdown for tags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong>Select Tags:</strong>
            <details>
              <summary style={{ 
                cursor: "pointer", 
                border: "1px solid #ccc", 
                borderRadius: 4, 
                padding: "6px 12px",
                backgroundColor: "#fff"
              }}>
                {tags.length > 0 ? `${tags.length} tags selected` : "Select tags"}
              </summary>
              <div style={{ 
                background: "#fff", 
                border: "1px solid #ccc", 
                padding: 12, 
                position: "absolute", 
                zIndex: 10,
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                maxHeight: 300,
                overflowY: "auto"
              }}>
                {allTags.map((t) => (
                  <label key={t} style={{ display: "block", marginBottom: 6, cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={tags.includes(t)} 
                      onChange={() => toggleTag(t)}
                      style={{ marginRight: 6 }}
                    /> 
                    {t}
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={fetchReport} 
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500
            }}
          >
            {loading ? "Loading..." : "Preview Table & Chart"}
          </button>
          
          <button 
            onClick={downloadPdf} 
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: loading ? "#ccc" : "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500
            }}
          >
            {loading ? "Downloading..." : "Export PDF"}
          </button>
        </div>
      </section>

      {/* Data Preview */}
      <section>
        <h3>Preview</h3>
        {data.length === 0 ? (
          <div style={{ 
            padding: 40, 
            textAlign: "center", 
            color: "#999",
            border: "2px dashed #ddd",
            borderRadius: 8
          }}>
            No data to display. Select your parameters and click "Preview Table & Chart".
          </div>
        ) : (
          <>
            {/* Chart */}
            <div style={{ 
              width: "100%", 
              height: 400, 
              marginBottom: 20,
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              backgroundColor: "#fff"
            }}>
              <ResponsiveContainer>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis 
                    dataKey="Time" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {tags.map((t, i) => (
                    <Line
                      key={t}
                      dataKey={t}
                      stroke={["#007bff", "#ff7300", "#00C49F", "#8884d8", "#ff0000", "#6f42c1"][i % 6]}
                      dot={false}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: 10, textAlign: "left" }}>Time</th>
                    {tags.map((t) => (
                      <th key={t} style={{ border: "1px solid #ddd", padding: 10, textAlign: "right" }}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                      <td style={{ border: "1px solid #eee", padding: 10 }}>{row.Time}</td>
                      {tags.map((t) => (
                        <td key={t} style={{ border: "1px solid #eee", padding: 10, textAlign: "right" }}>
                          {row[t] !== null && row[t] !== undefined ? row[t] : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: 12, color: "#666", fontSize: 14 }}>
              Showing {data.length} records
            </div>
          </>
        )}
      </section>
    </div>
  );
}