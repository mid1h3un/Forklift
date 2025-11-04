import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Rnd } from "react-rnd";
import "./TankTagDashboard.css";

const TankTagDashboard = () => {
  const tanks = useMemo(() => ["Tank A", "Tank B", "Tank C"], []);
  const tags = useMemo(() => ["Pressure", "Temperature", "Flow"], []);

  const [selected, setSelected] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [tagData, setTagData] = useState({}); // ✅ New state for Flask data

  // Get logged-in username
  const username = useMemo(() => localStorage.getItem("username") || "guest", []);

  // ✅ Fetch tag data from Flask backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/latest"); // Flask endpoint
        const data = await res.json();
        setTagData(data);
      } catch (error) {
        console.error("Error fetching data from Flask:", error);
      }
    };

    fetchData(); // fetch on load
    const interval = setInterval(fetchData, 5000); // update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // ✅ Update widgets whenever Flask data updates
  useEffect(() => {
    setWidgets((prev) =>
      prev.map((w) => ({
        ...w,
        value: tagData[w.name] || w.value || 0,
      }))
    );
  }, [tagData]);

  // Load widgets only for this user
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

  // Save widgets when changed (debounced)
  useEffect(() => {
    if (widgets.length === 0) return;
    const timer = setTimeout(() => {
      localStorage.setItem(`dashboardWidgets_${username}`, JSON.stringify(widgets));
    }, 500);
    return () => clearTimeout(timer);
  }, [widgets, username]);

  // Add widget (no random values now)
  const addWidget = useCallback(
    (name, type) => {
      setWidgets((prev) => {
        const alreadyExists = prev.some((w) => w.name === name);
        if (alreadyExists) return prev;

        return [
          ...prev,
          {
            id: Date.now(),
            name,
            type,
            x: 50,
            y: 50,
            width: 200,
            height: 120,
            value: tagData[name] || 0, // ✅ use Flask value
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
      if (tanks.includes(name)) addWidget(name, "tank");
      if (tags.includes(name)) addWidget(name, "tag");
      setSelected("");
    },
    [tanks, tags, addWidget]
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

  const getTankColor = useCallback((value) => {
    const percent = parseFloat(value);
    if (percent < 40) return "#007bff";
    if (percent < 75) return "#00c851";
    return "#ff4444";
  }, []);

  return (
    <div className="dashboard-container">
      {/* Control Bar */}
      <div className="control-bar">
        <select value={selected} onChange={handleSelect} className="dropdown">
          <option value="">Select Tank/Tag</option>
          <optgroup label="Tanks">
            {tanks.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </optgroup>
          <optgroup label="Tags">
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </optgroup>
        </select>

        {widgets.length > 0 && (
          <button className="clear-btn" onClick={() => setWidgets([])}>
            Clear Dashboard
          </button>
        )}
      </div>

      {/* Dashboard Widgets */}
      <div className="dashboard-area">
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
            minWidth={180}
            minHeight={250}
            className="widget"
          >
            <div className="widget-content">
              <button className="delete-btn" onClick={() => deleteWidget(w.id)}>
                ✕
              </button>
              <div className="widget-header">
                <div className="widget-title">{w.name}</div>
              </div>

              <div className="widget-body">
                {w.type === "tank" ? (
                  <div className="tank-widget">
                    <div className="tank">
                      <div
                        className="water"
                        style={{
                          height: `${parseFloat(w.value)}%`,
                          background: `linear-gradient(to top, ${getTankColor(
                            w.value
                          )}, #aaddff)`,
                        }}
                      />
                    </div>
                    <div className="tank-label">{w.value}%</div>
                  </div>
                ) : (
                  <div className="tag-display">
                    <div className="tag-value">{w.value}</div>
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

export default TankTagDashboard;
