import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./index.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = "https://solvexesapp.com";

  const handleAuth = async () => {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = isLogin ? "/login" : "/register";
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, {
        username,
        password,
      });

      if (isLogin) {
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("username", username);
        navigate("/home");
      } else {
        alert("Registration successful! You can now log in.");
        setIsLogin(true);
        setPassword(""); // Clear password after registration
      }
    } catch (err) {
      console.error("Auth error:", err);
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAuth();
    }
  };

  return (
    <div className="body">
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="title">{isLogin ? "Login" : "Register"}</h1>
          <p className="subtitle">
            {isLogin ? "Please login to continue" : "Register to get started"}
          </p>

         <div className="input-group">
            <span className="input-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
                </svg>
            </span>

            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <span className="input-icon">
              <svg viewBox="0 0 24 24">
                <path d="M17 8h-1V6c0-2.8-2.2-5-5-5S6 3.2 6 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8 6c0-1.7 1.3-3 3-3s3 1.3 3 3v2H8V6z"/>
              </svg>
            </span>

            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>


          <button onClick={handleAuth} disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </button>

          <p style={{ marginTop: '15px', textAlign: 'center' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword("");
              }}
              style={{ 
                color: '#3498db', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                textDecoration: 'underline'
              }}
            >
              {isLogin ? "Register" : "Login"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
