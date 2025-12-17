import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TankTagDashboard from "./TankTagDashboard";
import Trends from "./Trends";
import Reports from "./Reports";
import "./MainDashboard.css";
import logo from "./assets/solvexes.png"
const MainDashboard = () => {
  const [activeTab, setActiveTab] = useState("tanks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "guest";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  };

  // Replace this URL with your actual website URL
  const handlePoweredByClick = () => {
    window.open("https://solvexes.com/", "_blank");
  };

  return (
    <div className="main-dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            {sidebarOpen ? "🌐 My System" : "🌐"}
          </h2>
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
        </div>

        <nav className="sidebar-content">
          <button
            className={`sidebar-btn ${activeTab === "tanks" ? "active" : ""}`}
            onClick={() => setActiveTab("tanks")}
          >
            🧱 {sidebarOpen && "Dashboard"}
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
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-btn powered-by"
            onClick={handlePoweredByClick}
          >
            {sidebarOpen ? (
              <div className="powered-by-content">
                <span className="powered-text">Powered by:</span>
                <img 
                  src={logo} 
                  alt="Company Logo" 
                  className="powered-logo"
                />
              </div>
            ) : (
              <span className="logo-icon">⚡</span>
            )}
          </button>
          <button className="sidebar-btn logout" onClick={handleLogout}>
            🚪 {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === "tanks" && <TankTagDashboard />}
        {activeTab === "Trends" && <Trends />}
        {activeTab === "Reports" && <Reports />}
      </main>
    </div>
  );
};

export default MainDashboard;
