import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TankTagDashboard from "./TankTagDashboard";
import Trends from "./Trends";
import Reports from "./Reports";
import "./MainDashboard.css";

const Mimic = () => (
  <div className="section-content">
    <h2>🔁 Mimic</h2>
    <p>This is your process mimic view — show plant visuals or flow diagrams here.</p>
  </div>
);

const MainDashboard = () => {
  const [activeTab, setActiveTab] = useState("tanks");
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "guest";
  const user = { name: username, email: `${username}@example.com` };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  };

  return (
    <div className="main-dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">{sidebarOpen ? "🌐 My System" : "🌐"}</h2>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
        </div>

        <div className="sidebar-content">
          <button
            className={`sidebar-btn ${activeTab === "tanks" ? "active" : ""}`}
            onClick={() => setActiveTab("tanks")}
          >
            🧱 {sidebarOpen && "Tank Dashboard"}
          </button>

          <button
            className={`sidebar-btn ${activeTab === "Trends" ? "active" : ""}`}
            onClick={() => setActiveTab("Trends")}
          >
            📊 {sidebarOpen && "Trends"}
          </button>

          <button
            className={`sidebar-btn ${activeTab === "Reports" ? "active" : ""}`}
            onClick={() => setActiveTab("Reports")}
          >
            📑 {sidebarOpen && "Reports"}
          </button>

          <button
            className={`sidebar-btn ${activeTab === "mimic" ? "active" : ""}`}
            onClick={() => setActiveTab("mimic")}
          >
            🔁 {sidebarOpen && "Mimic"}
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn profile" onClick={() => setShowProfile(true)}>
            👤 {sidebarOpen && "Profile"}
          </button>
          <button className="sidebar-btn logout" onClick={handleLogout}>
            🚪 {sidebarOpen && "Logout"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === "tanks" && <TankTagDashboard />}
        {activeTab === "Trends" && <Trends />}
        {activeTab === "Reports" && <Reports />}
        {activeTab === "mimic" && <Mimic />}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="profile-modal">
          <div className="profile-card">
            <h3>👤 Profile</h3>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <button className="close-profile" onClick={() => setShowProfile(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboard;
