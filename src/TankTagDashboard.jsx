import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Rnd } from "react-rnd";


const ForkliftDashboard = () => {
  const forklifts = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => `Forklift ${i + 1}`), 
    []
  );
  
  const [selected, setSelected] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [tagData, setTagData] = useState({});

  const username = useMemo(() => localStorage.getItem("username") || "guest", []);

  // Fetch tag data from Flask backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://flaskapi.us-east-1.elasticbeanstalk.com/api/latest");
        const data = await res.json();

        const timestamp = parseInt(data.time, 10);
        const readableTime = !isNaN(timestamp)
          ? new Date(timestamp * 1000).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "";

        const mappedData = {
          Speed: data.spd || 0,
          Voltage: data.volt || 0,
          Time: readableTime,
        };

        setTagData(mappedData);
      } catch (error) {
        console.error("Error fetching data from Flask:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update widgets whenever Flask data updates
  useEffect(() => {
    setWidgets((prev) =>
      prev.map((w) => ({
        ...w,
        speed: tagData.Speed || 0,
        voltage: tagData.Voltage || 0,
        time: tagData.Time || "",
      }))
    );
  }, [tagData]);

  // Load widgets for this user
  useEffect(() => {
    const saved = localStorage.getItem(`dashboardWidgets_${username}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setWidgets(parsed);
      } catch (error) {
        console.warn("Corrupted widget data, resetting storage");
        localStorage.removeItem(`dashboardWidgets_${username}`);
      }
    }
  }, [username]);

  // Save widgets when changed
  useEffect(() => {
    if (widgets.length === 0) return;
    const timer = setTimeout(() => {
      localStorage.setItem(`dashboardWidgets_${username}`, JSON.stringify(widgets));
    }, 500);
    return () => clearTimeout(timer);
  }, [widgets, username]);

  // Add forklift widget
  const addWidget = useCallback(
    (name) => {
      setWidgets((prev) => {
        const alreadyExists = prev.some((w) => w.name === name);
        if (alreadyExists) return prev;

        return [
          ...prev,
          {
            id: Date.now(),
            name,
            x: 50,
            y: 50,
            width: 280,
            height: 200,
            speed: tagData.Speed || 0,
            voltage: tagData.Voltage || 0,
            time: tagData.Time || "",
          },
        ];
      });
    },
    [tagData]
  );

  const deleteWidget = useCallback((id) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const handleSelect = useCallback(
    (e) => {
      const name = e.target.value;
      setSelected(name);
      if (!name) return;
      if (forklifts.includes(name)) addWidget(name);
      setSelected("");
    },
    [forklifts, addWidget]
  );

  const handleDragStop = useCallback((id, d) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x: d.x, y: d.y } : w))
    );
  }, []);

  const handleResizeStop = useCallback((id, direction, ref, delta, position) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              width: parseInt(ref.style.width, 10),
              height: parseInt(ref.style.height, 10),
              ...position,
            }
          : w
      )
    );
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#1a1a2e" }}>
      {/* Control Bar */}
      <div style={{
        padding: "15px 20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        gap: "15px",
        alignItems: "center"
      }}>
        <select 
          value={selected} 
          onChange={handleSelect}
          style={{
            padding: "10px 15px",
            fontSize: "15px",
            border: "none",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
            outline: "none",
            minWidth: "200px",
            fontWeight: "500"
          }}
        >
          <option value="">Select Forklift</option>
          {forklifts.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {widgets.length > 0 && (
          <button 
            onClick={() => setWidgets([])}
            style={{
              padding: "10px 20px",
              fontSize: "15px",
              border: "none",
              borderRadius: "8px",
              background: "#ff4757",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => e.target.style.background = "#ff3838"}
            onMouseOut={(e) => e.target.style.background = "#ff4757"}
          >
            Clear Dashboard
          </button>
        )}
      </div>

      {/* Dashboard Area */}
      <div style={{ 
        flex: 1, 
        position: "relative", 
        overflow: "hidden",
        background: "#1a1a2e"
      }}>
        {widgets.map((w) => (
          <Rnd
            key={w.id}
            bounds="parent"
            size={{ width: w.width, height: w.height }}
            position={{ x: w.x, y: w.y }}
            onDragStop={(e, d) => handleDragStop(w.id, d)}
            onResizeStop={(e, dir, ref, delta, pos) =>
              handleResizeStop(w.id, dir, ref, delta, pos)
            }
            minWidth={250}
            minHeight={200}
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              overflow: "hidden"
            }}
          >
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "12px 15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h3 style={{ 
                  margin: 0, 
                  color: "white", 
                  fontSize: "16px",
                  fontWeight: "600"
                }}>
                  {w.name}
                </h3>
                <button 
                  onClick={() => deleteWidget(w.id)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "white",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.3)"}
                  onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{
                flex: 1,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                background: "#f8f9fa"
              }}>
                <div style={{
                  background: "white",
                  padding: "12px 15px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontWeight: "600", color: "#555" }}>Speed:</span>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>
                    {w.speed} km/h
                  </span>
                </div>

                <div style={{
                  background: "white",
                  padding: "12px 15px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontWeight: "600", color: "#555" }}>Voltage:</span>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#764ba2" }}>
                    {w.voltage} V
                  </span>
                </div>

                <div style={{
                  background: "white",
                  padding: "12px 15px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px"
                }}>
                  <span style={{ fontWeight: "600", color: "#555", fontSize: "14px" }}>Time:</span>
                  <span style={{ fontSize: "13px", color: "#666" }}>
                    {w.time || "Loading..."}
                  </span>
                </div>
              </div>
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
};

export default ForkliftDashboard;