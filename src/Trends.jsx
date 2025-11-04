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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [updateFrequency, setUpdateFrequency] = useState(1000);

  // Generate mock data for demonstration (replace with real API call)
  const fetchLiveData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/latest");
const data = await response.json();

const mockData = {};
availableTags.forEach(tag => {
  if (data[tag] !== undefined) {
    // Remove units (like "°C", "L/s", "psi") and convert to number
    mockData[tag] = parseFloat(String(data[tag]).replace(/[^\d.-]/g, "")) || 0;
  } else {
    mockData[tag] = 0; // default if not found
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
      console.error("Error fetching live data:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!graph.isPaused) fetchLiveData();
    }, updateFrequency);

    return () => clearInterval(interval);
  }, [graph.isPaused, updateFrequency]);

  const togglePause = () =>
    setGraph((prev) => ({ ...prev, isPaused: !prev.isPaused }));

  const toggleTag = (tag) => {
    setGraph((prev) => {
      const selected = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag];
      
      const tagSettings = { ...prev.tagSettings };
      if (!tagSettings[tag]) {
        // Generate a random color for each tag
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

  const handleViewHistory = () => {
    if (!startTime || !endTime) {
      alert("Please select both start and end times.");
      return;
    }
    fetchHistoricalData();
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/historical-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      const data = await response.json();
      setGraph((prev) => ({ ...prev, data }));
      setShowHistoryModal(false);
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>📈 Trends</h2>

      <div style={{ marginBottom: "10px", position: "relative" }}>
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
                  width: "calc(100% - 8px)",
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

      <div
        style={{
          marginTop: "10px",
          justifyContent: "right",
          display: "flex",
          gap: "10px",
          alignItems: "center",
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
        <button 
          onClick={() => setShowHistoryModal(true)}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderRadius: "5px",
            border: "1px solid #ccc",
            background: "#17a2b8",
            color: "white"
          }}
        >
          📅 Historical Data
        </button>
        <select
          value={updateFrequency}
          onChange={(e) => setUpdateFrequency(Number(e.target.value))}
          style={{
            padding: "8px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            cursor: "pointer"
          }}
        >
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
        </select>
        <span>⏱ Update Frequency</span>
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
            zIndex: 100
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "2px solid #007bff",
              borderRadius: "10px",
              padding: "20px",
              width: "300px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <h3>📊 Historical Data</h3>
            <label style={{ display: "block", marginBottom: "10px" }}>
              Start Time:
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ display: "block", margin: "5px 0", width: "100%", padding: "5px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "10px" }}>
              End Time:
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ display: "block", margin: "5px 0", width: "100%", padding: "5px" }}
              />
            </label>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
                gap: "10px"
              }}
            >
              <button 
                onClick={handleViewHistory}
                style={{
                  flex: 1,
                  padding: "8px",
                  cursor: "pointer",
                  borderRadius: "5px",
                  border: "1px solid #007bff",
                  background: "#007bff",
                  color: "white"
                }}
              >
                View
              </button>
              <button 
                onClick={() => setShowHistoryModal(false)}
                style={{
                  flex: 1,
                  padding: "8px",
                  cursor: "pointer",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  background: "#f0f0f0"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trends;