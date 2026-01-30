import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TankTagDashboard from "./TankTagDashboard";
import Trends from "./Trends";
import Reports from "./Reports";
import ForkliftDashboard from "./Reportdashboard";
import "./MainDashboard.css";
import logo from "./assets/solvexes.png";

const MainDashboard = () => {
  const [activeTab, setActiveTab] = useState("tanks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "guest";

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // On mobile, start with sidebar closed
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  };

  const handlePoweredByClick = () => {
    window.open("https://solvexes.com/", "_blank");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // On mobile, close sidebar after selecting a tab
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
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
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
        </div>

        <nav className="sidebar-content">
          <button
            className={`sidebar-btn ${activeTab === "tanks" ? "active" : ""}`}
            onClick={() => handleTabChange("tanks")}
          >
            🧱 {sidebarOpen && "Dashboard"}
          </button>

          <button
            className={`sidebar-btn ${activeTab === "Trends" ? "active" : ""}`}
            onClick={() => handleTabChange("Trends")}
          >
            📊 {sidebarOpen && "Trends"}
          </button>

          <button
            className={`sidebar-btn ${activeTab === "Reports" ? "active" : ""}`}
            onClick={() => handleTabChange("Reports")}
          >
            📑 {sidebarOpen && "Reports"}
          </button>

          <button
            className={`sidebar-btn ${activeTab === "ReportDashboard" ? "active" : ""}`}
            onClick={() => handleTabChange("ReportDashboard")}
          >
            📈 {sidebarOpen && "Report Dashboard"}
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

      {/* Overlay for mobile (clicking outside closes sidebar) */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        {activeTab === "tanks" && <TankTagDashboard />}
        {activeTab === "Trends" && <Trends />}
        {activeTab === "Reports" && <Reports />}
        {activeTab === "ReportDashboard" && <ForkliftDashboard />}
      </main>
    </div>
  );
};

export default MainDashboard;
