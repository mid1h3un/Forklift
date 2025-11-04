import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./index.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

const handleAuth = async () => {
  try {
    const endpoint = isLogin ? "/login" : "/register";
    const res = await axios.post(`http://127.0.0.1:5000${endpoint}`, {
      username,
      password,
    });

    if (isLogin) {
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("username", username); // ✅ store username
      navigate("/home");
    } else {
      alert("Registration successful! You can now log in.");
      setIsLogin(true);
    }
  } catch (err) {
    alert(err.response?.data?.message || "Something went wrong");
  }
};


  return (
    <div className="body">
    <div className="auth-page">
      <div className="auth-card">
        <h2>{isLogin ? "Welcome Back 👋" : "Create Account"}</h2>
        <p className="subtitle">
          {isLogin ? "Please login to continue" : "Register to get started"}
        </p>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleAuth}>
          {isLogin ? "Login" : "Register"}
        </button>

        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? " Sign up" : " Login"}
          </span>
        </p>
      </div>
    </div>
    </div>
  );
}
