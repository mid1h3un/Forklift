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
import "./Trends.css";

const ForkliftTrends = () => {
  const forklifts = [
    { name: "Forklift T5", imei: "867512077469365" },
    { name: "Forklift T9", imei: "865931084963206" },
    { name: "Forklift T7", imei: "865931084970326" },
    { name: "Forklift T4", imei: "865931084979863" },
    { name: "Forklift D1", imei: "865931084970615" }
  ];

  const availableTags = [];
  forklifts.forEach(fl => {
    availableTags.push(`${fl.name}_Speed`);
    availableTags.push(`${fl.name}_Voltage`);
  });

  const [graph, setGraph] = useState({
    data: [],
    selectedTags: [],
    tagSettings: {},
    isPaused: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [updateFrequency, setUpdateFrequency] = useState(20000);
  const [frequencyValue, setFrequencyValue] = useState(20);
  const [frequencyUnit, setFrequencyUnit] = useState("seconds");
  
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewMode, setViewMode] = useState("live");
  const [historyAggregation, setHistoryAggregation] = useState("1s");
  const [debugInfo, setDebugInfo] = useState("");

  const API_BASE_URL = "https://www.solvexesapp.com/api";

  const getImeiFromTag = (tag) => {
    const parts = tag.split('_');
    const forkliftName = parts[0];
    const forklift = forklifts.find(f => f.name === forkliftName);
    return forklift?.imei;
  };

  const fetchLiveData = async () => {
    try {
      const uniqueImeis = [...new Set(
        graph.selectedTags.map(tag => getImeiFromTag(tag)).filter(Boolean)
      )];

      if (uniqueImeis.length === 0) return;

      const dataPromises = uniqueImeis.map(async (imei) => {
        try {
          const url = `${API_BASE_URL}/latest?imei=${imei}`;
          const response = await fetch(url);
          
          if (!response.ok) return null;
          
          const data = await response.json();
          return { imei, data };
        } catch (err) {
          console.error(`Error fetching data for ${imei}:`, err);
          return null;
        }
      });

      const results = await Promise.all(dataPromises);
      
      const newDataPoint = { 
        Time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      };
      
      results.forEach(result => {
        if (!result) return;
        const { imei, data } = result;
        const forklift = forklifts.find(f => f.imei === imei);
        if (!forklift) return;

        const speedTag = `${forklift.name}_Speed`;
        const voltageTag = `${forklift.name}_Voltage`;
        
        newDataPoint[speedTag] = parseFloat(data.spd) || 0;
        newDataPoint[voltageTag] = parseFloat(data.volt) || 0;
      });

      setGraph((prev) => {
        const updatedData = [...prev.data.slice(-19), newDataPoint];
        return { ...prev, data: updatedData };
      });

      setDebugInfo(`Last fetch: ${new Date().toLocaleTimeString()} - ${results.filter(r => r).length} devices`);
    } catch (error) {
      console.error("Error fetching live data:", error);
      setDebugInfo(`Error: ${error.message}`);
    }
  };

  const fetchHistoryData = async () => {
    if (!historyStart || !historyEnd) {
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
      // Convert datetime-local to ISO format with timezone
      const startISO = new Date(historyStart).toISOString();
      const endISO = new Date(historyEnd).toISOString();
      
      console.log("Fetching history:", { startISO, endISO, selectedTags });
      
      const uniqueImeis = [...new Set(
        selectedTags.map(tag => getImeiFromTag(tag)).filter(Boolean)
      )];

      if (uniqueImeis.length === 0) {
        alert("No valid forklifts selected");
        setIsLoadingHistory(false);
        return;
      }

      const historyPromises = uniqueImeis.map(async (imei) => {
        try {
          const params = new URLSearchParams({
            start: startISO,
            end: endISO,
            imei: imei,
            aggregation: historyAggregation,
          });

          const url = `${API_BASE_URL}/history?${params}`;
          console.log(`Fetching history: ${url}`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch history for ${imei}:`, errorText);
            return { imei, data: [] };
          }
          
          const data = await response.json();
          return { imei, data: Array.isArray(data) ? data : [] };
        } catch (err) {
          console.error(`Error fetching history for ${imei}:`, err);
          return { imei, data: [] };
        }
      });

      const results = await Promise.all(historyPromises);

      const timeMap = new Map();

      results.forEach(({ imei, data }) => {
        const forklift = forklifts.find(f => f.imei === imei);
        if (!forklift || !data) return;

        data.forEach(item => {
          const time = item.time;
          if (!timeMap.has(time)) {
            timeMap.set(time, { Time: time });
          }
          
          const point = timeMap.get(time);
          point[`${forklift.name}_Speed`] = parseFloat(item.spd) || 0;
          point[`${forklift.name}_Voltage`] = parseFloat(item.volt) || 0;
        });
      });

      const formattedData = Array.from(timeMap.values()).sort((a, b) => 
        new Date(a.Time) - new Date(b.Time)
      );

      if (formattedData.length === 0) {
        alert("No data found for the selected date range.");
        setIsLoadingHistory(false);
        return;
      }

      setGraph((prev) => ({
        ...prev,
        data: formattedData,
        isPaused: true,
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
    a.download = `forklift_trends_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const backToLive = () => {
    setGraph((prev) => ({
      ...prev,
      data: [],
      isPaused: false
    }));
    setViewMode("live");
  };

  useEffect(() => {
    if (viewMode !== "live" || graph.isPaused || graph.selectedTags.length === 0) return;

    fetchLiveData();
    const interval = setInterval(fetchLiveData, updateFrequency);
    return () => clearInterval(interval);
  }, [graph.isPaused, updateFrequency, viewMode, graph.selectedTags.length]);

  const togglePause = () =>
    setGraph((prev) => ({ ...prev, isPaused: !prev.isPaused }));

  const toggleTag = (tag) => {
    setGraph((prev) => {
      const selected = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag];
      
      const tagSettings = { ...prev.tagSettings };
      if (!tagSettings[tag]) {
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'];
        const isSpeed = tag.includes('Speed');
        tagSettings[tag] = { 
          color: colors[availableTags.indexOf(tag) % colors.length], 
          scale: isSpeed ? 20 : 50,
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

  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", background:"#1a1a2e", minHeight: "100vh" }}>
      <h2 style={{color:"white"}}>
        📈 Forklift Trends {viewMode === "history" && <span style={{ fontSize: "16px", color: "#ffffff" }}>(Historical View)</span>}
      </h2>

      {debugInfo && (
        <div style={{ 
          background: "#333", 
          color: "#0f0", 
          padding: "8px", 
          borderRadius: "4px", 
          marginBottom: "10px",
          fontFamily: "monospace",
          fontSize: "12px"
        }}>
          {debugInfo} | Data points: {graph.data.length} | Selected: {graph.selectedTags.length} tags
        </div>
      )}

      <div style={{ marginBottom: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <div style={{
                  flex: 1,
                  padding: "4px",
                  border: "1px solid #ccc",
                  background: "#f0f0f0",
                  textAlign: "center",
                  fontWeight: "bold",
                }}>
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
                <span style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}>
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
                    borderBottom: "1px solid #ddd",
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
                          onChange={(e) => updateSetting(tag, "color", e.target.value)}
                          style={{ marginLeft: "4px", verticalAlign: "middle", cursor: "pointer" }}
                        />
                      </label>
                      <label style={{ display: "inline-block", marginRight: "8px" }}>
                        Scale:
                        <input
                          type="number"
                          min="1"
                          value={graph.tagSettings[tag].scale}
                          onChange={(e) => updateSetting(tag, "scale", e.target.value)}
                          style={{ width: "60px", marginLeft: "4px", padding: "2px" }}
                        />
                      </label>
                      <label style={{ display: "inline-block" }}>
                        Divisions:
                        <input
                          type="number"
                          min="1"
                          value={graph.tagSettings[tag].divisions}
                          onChange={(e) => updateSetting(tag, "divisions", e.target.value)}
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

        {viewMode === "history" && (
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
        )}

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
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "auto" }}>
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
            <span style={{color: "white"}}>⏱ Update Interval</span>
          </div>
        )}
      </div>

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
                  background: "#ff4757",
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
              <input
                type="datetime-local"
                value={historyStart}
                onChange={(e) => setHistoryStart(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  borderRadius: "5px", 
                  border: "1px solid #ccc"
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>End Date & Time:</label>
              <input
                type="datetime-local"
                value={historyEnd}
                onChange={(e) => setHistoryEnd(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  borderRadius: "5px", 
                  border: "1px solid #ccc"
                }}
              />
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

      <div style={{ 
        width: "100%", 
        height: "440px", 
        background: "#f9f9f9", 
        borderRadius: "8px", 
        padding: "10px"
      }}>
        {graph.selectedTags.length === 0 ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%", 
            color: "#999"
          }}>
            Select tags to display data on the chart
          </div>
        ) : graph.data.length === 0 ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%", 
            color: "#999"
          }}>
            Waiting for data...
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
                  label={{ 
                    value: tag, 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: graph.tagSettings[tag]?.color } 
                  }}
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

export default ForkliftTrends;
