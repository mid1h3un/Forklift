import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Trends = () => {
  const availableTags = ["TT1", "TT2", "TT3", "TT4", "LT1", "LT2", "LT3", "A", "B"];

  const [graph, setGraph] = useState({
    data: [],
    selectedTags: [],
    tagSettings: {},
    isPaused: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [updateFrequency, setUpdateFrequency] = useState(1000);
  const [frequencyValue, setFrequencyValue] = useState(1);
  const [frequencyUnit, setFrequencyUnit] = useState("seconds");
  
  // History modal states
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyStartTime, setHistoryStartTime] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyEndTime, setHistoryEndTime] = useState("");
  const [historyTags, setHistoryTags] = useState([]);
  const [historyAggregation, setHistoryAggregation] = useState("1s");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewMode, setViewMode] = useState("live"); // 'live' or 'history'

  // Base API URL
  const API_BASE_URL = "http://localhost:5000/api";

  // Fetch live data
  const fetchLiveData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/latest`);
      const data = await response.json();

      const mockData = {};
      availableTags.forEach(tag => {
        if (data[tag] !== undefined) {
          mockData[tag] = parseFloat(String(data[tag]).replace(/[^\d.-]/g, "")) || 0;
        } else {
          mockData[tag] = 0;
        }
      });

      const newPoint = {
        Time: new Date().toLocaleTimeString(),
        ...mockData,
      };

      setGraph((prev) => ({
        ...prev,
        data: [...prev.data.slice(-19), newPoint],
      }));
    } catch (error) {
      console.error("Error fetching live data:", error.message);
    }
  };

  // Fetch historical data
  const fetchHistoryData = async () => {
    if (!historyStartDate || !historyStartTime || !historyEndDate || !historyEndTime) {
      alert("Please select both start and end date/time");
      return;
    }

    const selectedTags = graph.selectedTags;

    if (selectedTags.length === 0) {
      alert("Please select at least one tag from the main tag selector");
      return;
    }
    setIsLoadingHistory(true);
    
    try {
      const startDateTime = `${historyStartDate}T${historyStartTime}`;
      const endDateTime = `${historyEndDate}T${historyEndTime}`;
      
      console.log("Fetching history from:", startDateTime, "to:", endDateTime);
      console.log("Tags:", selectedTags);
      console.log("Aggregation:", historyAggregation);
      
      const params = new URLSearchParams({
        start: startDateTime,
        end: endDateTime,
        tags: selectedTags.join(','),
        aggregation: historyAggregation
      });

      const url = `${API_BASE_URL}/history?${params}`;
      console.log("Request URL:", url);

      const response = await fetch(url);
      const data = await response.json();
      
      console.log("Response data:", data);
      console.log("Number of records:", data.length);

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      if (!data || data.length === 0) {
        alert("No data found for the selected date range. Please try a different range.");
        setIsLoadingHistory(false);
        return;
      }

      // Transform the data to match chart format
      const formattedData = data.map(item => {
        const dataPoint = {
          Time: new Date(item.timestamp).toLocaleString()
        };
        
        // Add each tag's value
        selectedTags.forEach(tag => {
          dataPoint[tag] = item[tag] !== undefined ? item[tag] : 0;
      });
        
        return dataPoint;
      });

      console.log("Formatted data:", formattedData.slice(0, 3)); // Log first 3 records

      setGraph((prev) => ({
        ...prev,
        data: formattedData,
        isPaused: true
      }));

      setViewMode("history");
      setShowHistoryModal(false);
      
      alert(`Successfully loaded ${formattedData.length} data points`);
    } catch (error) {
      console.error("Error fetching history data:", error);
      alert(`Failed to fetch historical data: ${error.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (graph.data.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Time", ...graph.selectedTags];
    const csvContent = [
      headers.join(","),
      ...graph.data.map(row => 
        [row.Time, ...graph.selectedTags.map(tag => row[tag] || 0)].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trends_data_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Back to live view
  const backToLive = () => {
    setGraph((prev) => ({
      ...prev,
      data: [],
      isPaused: false
    }));
    setViewMode("live");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!graph.isPaused && viewMode === "live") fetchLiveData();
    }, updateFrequency);

    return () => clearInterval(interval);
  }, [graph.isPaused, updateFrequency, viewMode]);

  const togglePause = () =>
    setGraph((prev) => ({ ...prev, isPaused: !prev.isPaused }));

  const toggleTag = (tag) => {
    setGraph((prev) => {
      const selected = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag];
      
      const tagSettings = { ...prev.tagSettings };
      if (!tagSettings[tag]) {
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
        tagSettings[tag] = { 
          color: colors[availableTags.indexOf(tag) % colors.length], 
          scale: 100, 
          divisions: 5 
        };
      }
      return { ...prev, selectedTags: selected, tagSettings };
    });
  };

  const updateSetting = (tag, key, value) => {
    setGraph((prev) => ({
      ...prev,
      tagSettings: {
        ...prev.tagSettings,
        [tag]: { ...prev.tagSettings[tag], [key]: Number(value) || value },
      },
    }));
  };

  const handleFrequencyChange = (value, unit) => {
    const numValue = Number(value);
    if (numValue > 0) {
      setFrequencyValue(numValue);
      setFrequencyUnit(unit);
      const multiplier = unit === "seconds" ? 1000 : 60000;
      setUpdateFrequency(numValue * multiplier);
    }
  };

  const toggleHistoryTag = (tag) => {
    setHistoryTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Check database stats

  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>📈 Trends {viewMode === "history" && <span style={{ fontSize: "16px", color: "#666" }}>(Historical View)</span>}</h2>

      <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              borderRadius: "5px",
              border: "1px solid #007bff",
              background: "#007bff",
              color: "white"
            }}
          >
            🎯 Select Tags ({graph.selectedTags.length})
          </button>
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "10px",
                zIndex: 10,
                width: "400px",
                maxHeight: "400px",
                overflowY: "auto",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "4px",
                    border: "1px solid #ccc",
                    background: "#f0f0f0",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  TAG LIST
                </div>
                <button
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    padding: "5px 9px",
                    cursor: "pointer",
                    background: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    marginLeft: "5px"
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ marginBottom: "8px", position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "calc(93% - 8px)",
                    padding: "4px 4px 4px 28px",
                    borderRadius: "10px",
                    border: "1px solid #ccc",
                    height: "30px",
                  }}
                />
              </div>

              {filteredTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    marginBottom: "8px",
                    borderBottom: "1px solid #eee",
                    paddingBottom: "8px",
                  }}
                >
                  <label style={{ display: "block", marginBottom: "4px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={graph.selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      style={{ marginRight: "8px" }}
                    />
                    <strong>{tag}</strong>
                  </label>
                  {graph.selectedTags.includes(tag) && graph.tagSettings[tag] && (
                    <div style={{ marginLeft: "20px", fontSize: "12px" }}>
                      <label style={{ display: "inline-block", marginRight: "8px" }}>
                        Color:
                        <input
                          type="color"
                          value={graph.tagSettings[tag].color}
                          onChange={(e) =>
                            updateSetting(tag, "color", e.target.value)
                          }
                          style={{ marginLeft: "4px", verticalAlign: "middle", cursor: "pointer" }}
                        />
                      </label>
                      <label style={{ display: "inline-block", marginRight: "8px" }}>
                        Scale:
                        <input
                          type="number"
                          min="1"
                          value={graph.tagSettings[tag].scale}
                          onChange={(e) =>
                            updateSetting(tag, "scale", e.target.value)
                          }
                          style={{ width: "60px", marginLeft: "4px", padding: "2px" }}
                        />
                      </label>
                      <label style={{ display: "inline-block" }}>
                        Divisions:
                        <input
                          type="number"
                          min="1"
                          value={graph.tagSettings[tag].divisions}
                          onChange={(e) =>
                            updateSetting(tag, "divisions", e.target.value)
                          }
                          style={{ width: "60px", marginLeft: "4px", padding: "2px" }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowHistoryModal(true)}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderRadius: "5px",
            border: "1px solid #17a2b8",
            background: "#17a2b8",
            color: "white"
          }}
        >
          📊 View History
        </button>

          <button 
            onClick={backToLive}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              borderRadius: "5px",
              border: "1px solid #28a745",
              background: "#28a745",
              color: "white"
            }}
          >
            🔴 Back to Live
          </button>
        

        <button 
          onClick={exportToCSV}
          disabled={graph.data.length === 0}
          style={{
            padding: "8px 16px",
            cursor: graph.data.length === 0 ? "not-allowed" : "pointer",
            borderRadius: "5px",
            border: "1px solid #6f42c1",
            background: graph.data.length === 0 ? "#ccc" : "#6f42c1",
            color: "white"
          }}
        >
          💾 Export CSV
        </button>
          {viewMode === "live" && (
    <div
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        marginLeft: "auto"  // pushes controls to the right
      }}
    >
      <button 
        onClick={togglePause}
        style={{
          padding: "8px 16px",
          cursor: "pointer",
          borderRadius: "5px",
          border: "1px solid #ccc",
          background: graph.isPaused ? "#28a745" : "#ffc107"
        }}
      >
        {graph.isPaused ? "▶️ Play" : "⏸ Pause"}
      </button>
      <input
        type="number"
        min="1"
        value={frequencyValue}
        onChange={(e) => handleFrequencyChange(e.target.value, frequencyUnit)}
        style={{
          padding: "8px",
          borderRadius: "5px",
          border: "1px solid #ccc",
          width: "60px"
        }}
      />
      <select
        value={frequencyUnit}
        onChange={(e) => handleFrequencyChange(frequencyValue, e.target.value)}
        style={{
          padding: "8px",
          borderRadius: "5px",
          border: "1px solid #ccc",
          cursor: "pointer"
        }}
      >
        <option value="seconds">Seconds</option>
        <option value="minutes">Minutes</option>
      </select>
      <span>⏱ Update Frequency</span>
    </div>
  )}
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "20px",
              width: "500px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0 }}>📊 Historical Data</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: "5px 10px",
                  cursor: "pointer",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "3px"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Start Date & Time:</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
                <input
                  type="time"
                  value={historyStartTime}
                  onChange={(e) => setHistoryStartTime(e.target.value)}
                  style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>End Date & Time:</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
                <input
                  type="time"
                  value={historyEndTime}
                  onChange={(e) => setHistoryEndTime(e.target.value)}
                  style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Data Aggregation:</label>
              <select
                value={historyAggregation}
                onChange={(e) => setHistoryAggregation(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              >
                <option value="1s">Raw Data (No Aggregation)</option>
                <option value="1min">1 Minute Average</option>
                <option value="5min">5 Minute Average</option>
                <option value="1hr">1 Hour Average</option>
              </select>
              <small style={{ color: "#666", display: "block", marginTop: "5px" }}>
                Note: Use aggregation for large date ranges to improve performance
              </small>
            </div>

            <button
              onClick={fetchHistoryData}
              disabled={isLoadingHistory}
              style={{
                width: "100%",
                padding: "10px",
                cursor: isLoadingHistory ? "not-allowed" : "pointer",
                borderRadius: "5px",
                border: "none",
                background: isLoadingHistory ? "#ccc" : "#007bff",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold"
              }}
            >
              {isLoadingHistory ? "Loading..." : "OK"}
            </button>
          </div>
        </div>
      )}

      <div style={{ width: "100%", height: "440px", background: "#f9f9f9", borderRadius: "8px", padding: "10px" }}>
        {graph.selectedTags.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
            Select tags to display data on the chart
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={graph.data}>
              <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
              <XAxis dataKey="Time" />
              {graph.selectedTags.map((tag, i) => (
                <YAxis
                  key={tag}
                  yAxisId={tag}
                  orientation={i % 2 === 0 ? "left" : "right"}
                  stroke={graph.tagSettings[tag]?.color || "#007bff"}
                  domain={[0, (graph.tagSettings[tag]?.scale || 100) * (graph.tagSettings[tag]?.divisions || 5)]}
                  label={{ value: tag, angle: -90, position: 'insideLeft', style: { fill: graph.tagSettings[tag]?.color } }}
                />
              ))}
              <Tooltip />
              <Legend />
              {graph.selectedTags.map((tag) => (
                <Line
                  key={tag}
                  type="monotone"
                  dataKey={tag}
                  yAxisId={tag}
                  stroke={graph.tagSettings[tag]?.color || "#007bff"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Trends;