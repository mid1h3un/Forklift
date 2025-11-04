import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./login";
import MainDashboard from "./MainDashboard";
import AdminDashboard from "./AdminDashboard";

function App() {
  const isLoggedIn = !!localStorage.getItem("token");
  const username = localStorage.getItem("username");

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />

        {/* Regular user dashboard */}
        <Route
          path="/home"
          element={isLoggedIn ? <MainDashboard /> : <Navigate to="/" />}
        />

        {/* Admin-only dashboard */}
        <Route
          path="/admin"
          element={
            isLoggedIn? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
