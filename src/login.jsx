import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./index.css";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const API_BASE_URL = "https://solvexesapp.com";

  // Pre-warm the API on component mount
  useEffect(() => {
    const warmUpAPI = async () => {
      try {
        await axios.get(`${API_BASE_URL}/`, { timeout: 5000 });
        console.log("API warmed up successfully");
      } catch (err) {
        console.log("API warm-up attempt completed");
      }
    };
    warmUpAPI();
  }, []);

  const handleAuth = async (retryCount = 0) => {
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    setError("");
    setLoading(true);

    console.log(`Login attempt ${retryCount + 1}`, { username, endpoint: `${API_BASE_URL}/login` });

    try {
      const res = await axios.post(
        `${API_BASE_URL}/login`,
        {
          username,
          password,
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: false,
        }
      );

      console.log("Login successful:", res.data);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("username", username);
      navigate("/home");
    } catch (err) {
      console.error("Auth error details:", {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status
      });

      const shouldRetry = retryCount < 2 && (
        err.code === 'ERR_NETWORK' || 
        err.code === 'ECONNABORTED' ||
        err.message.includes('Network Error') ||
        err.message.includes('timeout') ||
        err.response?.status === 502 ||
        err.response?.status === 503 ||
        err.response?.status === 504 ||
        !err.response
      );

      if (shouldRetry) {
        setError(`Connection issue, retrying... (Attempt ${retryCount + 2}/3)`);
        setTimeout(() => handleAuth(retryCount + 1), 2000);
        return;
      }

      if (retryCount === 0 && err.response?.status >= 500) {
        setError("Server error, retrying...");
        setTimeout(() => handleAuth(1), 2000);
        return;
      }

      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.detail || 
                          err.message || 
                          "Something went wrong. Please try again.";
      setError(errorMessage);
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
          <h1 className="title">Login</h1>
          <p className="subtitle">Please login to continue</p>
          {error && <p className="error-text">{error}</p>}

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
            {loading ? "Loading..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
