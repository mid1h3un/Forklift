import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Rnd } from "react-rnd";
import logo from "./assets/cc.png";

const ForkliftDashboard = () => {
  const forklifts = useMemo(() => ([
    { name: "Forklift T5", imei: "867512077469365" },
    { name: "Forklift T9", imei: "865931084963206" },
    { name: "Forklift T7", imei: "865931084970326" },
    { name: "Forklift T4", imei: "865931084979863" },
    { name: "Forklift D1", imei: "865931084970615" }
  ]), []);

  const [selected, setSelected] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to always have current widgets in fetch callback
  const widgetsRef = useRef(widgets);
  const fetchIntervalRef = useRef(null);
  
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const username = localStorage.getItem("username") || "guest";

  /* ===============================
     LOAD DASHBOARD FROM STORAGE
     =============================== */
  useEffect(() => {
    const loadDashboard = () => {
      try {
        const saved = localStorage.getItem(`dashboard_${username}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setWidgets(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboard();
  }, [username]);

  /* ===============================
     SAVE DASHBOARD TO STORAGE
     =============================== */
  useEffect(() => {
    if (isLoading) return;
    
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          `dashboard_${username}`,
          JSON.stringify(widgets)
        );
      } catch (err) {
        console.error("Failed to save dashboard:", err);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [widgets, username, isLoading]);

  /* ===============================
     FETCH DATA FOR ALL WIDGETS
     =============================== */
  useEffect(() => {
    const fetchData = async () => {
      const currentWidgets = widgetsRef.current;
      
      if (currentWidgets.length === 0) {
        return;
      }

      try {
        const updated = await Promise.all(
          currentWidgets.map(async (w) => {
            try {
              const res = await fetch(
                `https://solvexesapp.com/api/latest?imei=${w.imei}`
              );

              if (!res.ok) {
                return w;
              }
              
              const data = await res.json();

              const ts = parseInt(data.time, 10);
              const readableTime = !isNaN(ts)
                ? new Date(ts * 1000).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Invalid time";

              return {
                ...w,
                speed: data.spd || 0,
                voltage: data.volt || 0,
                time: readableTime,
                lastUpdate: new Date().toLocaleTimeString()
              };
            } catch (err) {
              console.error(`Fetch error for ${w.imei}:`, err);
              return w;
            }
          })
        );

        // Only update if data actually changed
        setWidgets(prev => {
          const hasChanges = updated.some((newWidget, idx) => {
            const oldWidget = prev[idx];
            return !oldWidget || 
                   newWidget.speed !== oldWidget.speed || 
                   newWidget.voltage !== oldWidget.voltage ||
                   newWidget.time !== oldWidget.time;
          });
          
          return hasChanges ? updated : prev;
        });
      } catch (err) {
        console.error("Fetch error", err);
      }
    };

    // Clear existing interval
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
    }

    // Initial fetch
    if (widgetsRef.current.length > 0) {
      fetchData();
    }
    
    // Set up interval
    fetchIntervalRef.current = setInterval(fetchData, 2000);

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, []); // Empty dependency - uses ref for widgets

  /* ===============================
     ADD / REMOVE WIDGET
     =============================== */
  const addWidget = useCallback((forklift) => {
    setWidgets((prev) => {
      if (prev.some((w) => w.imei === forklift.imei)) {
        console.log(`Widget for ${forklift.name} already exists`);
        return prev;
      }

      const newWidget = {
        id: Date.now(),
        name: forklift.name,
        imei: forklift.imei,
        x: 50 + (prev.length * 20),
        y: 50 + (prev.length * 20),
        width: 250,
        height: 200,
        speed: 0,
        voltage: 0,
        time: "",
        lastUpdate: ""
      };

      return [...prev, newWidget];
    });
  }, []);

  const deleteWidget = useCallback((id) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const handleSelect = useCallback(
    (e) => {
      const name = e.target.value;
      setSelected(name);
      if (!name) return;

      const forklift = forklifts.find((f) => f.name === name);
      if (forklift) {
        addWidget(forklift);
      }
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

  if (isLoading) {
    return (
      <div style={{ 
        width: "100%", 
        height: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#1a1a2e",
        color: "white",
        fontSize: "18px"
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#1a1a2e" }}>
      {/* Control Bar */}
      <div style={{
        padding: "1px 10px",
        background: "linear-gradient(135deg, #0a0a0aff 0%, #000000ff 100%)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        gap: "15px",
        alignItems: "center",
        flexWrap: "wrap"
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
            <option key={f.imei} value={f.name}>{f.name}</option>
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

        <div
          style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "30px",
              color: "white",
              fontSize: "14px",
              fontWeight: "500"
            }}
      >
      
      <img
        src={logo}
        alt="Logo"
        style={{
        height: "60px",
        objectFit: "contain",
      }}
    />
  </div>
      </div>

      {/* Dashboard Area */}
      <div style={{ 
        flex: 1, 
        position: "relative", 
        overflow: "hidden",
        background: "#1a1a2e"
      }}>
        {widgets.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "18px",
            textAlign: "center"
          }}>
            Select a forklift to add to dashboard
          </div>
        )}

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
                gap: "12px",
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
                  <span style={{ fontWeight: "600", color: "#555", fontSize: "14px" }}>Data Time:</span>
                  <span style={{ fontSize: "13px", color: "#666" }}>
                    {w.time || "Waiting for data..."}
                  </span>
                </div>

                {w.lastUpdate && (
                  <div style={{
                    fontSize: "11px",
                    color: "#999",
                    textAlign: "center"
                  }}>
                    Last updated: {w.lastUpdate}
                  </div>
                )}
              </div>
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
};

export default ForkliftDashboard;
