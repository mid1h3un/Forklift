import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // Fetch all users
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/admin/users`);
      setUsers(res.data.users);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      alert("Please fill both fields");
      return;
    }
    try {
      await axios.post(`http://localhost:5000/admin/add_user`, newUser);
      setNewUser({ username: "", password: "" });
      fetchUsers();
    } catch (err) {
      alert("Error adding user");
    }
  };

  // Delete user
  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await axios.delete(`http://localhost:5000/admin/delete_user/${username}`);
      fetchUsers();
    } catch (err) {
      alert("Error deleting user");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="admin-dashboard">
      <h2>👑 Admin Dashboard</h2>

      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDeleteUser(u.username)}>
                    ❌ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="add-user-form" onSubmit={handleAddUser}>
        <h3>Add New User</h3>
        <input
          type="text"
          placeholder="Username"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
        />
        <button type="submit">➕ Add User</button>
      </form>
    </div>
  );
};

export default AdminDashboard;
