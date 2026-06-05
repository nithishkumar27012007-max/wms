import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../styles/global.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {

        const res = await fetch("https://underwear-locks-latinas-anonymous.trycloudflare.com/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Login failed");
        }

        // ---------------------------------
        // Store JWT Token
        // ---------------------------------
        localStorage.setItem(
            "token",
            data.access_token
        );

        // ---------------------------------
        // Store Session UUID
        // ---------------------------------
        localStorage.setItem(
            "session_uuid",
            data.session_uuid
        );

        try {
            const decoded = jwtDecode(data.access_token);
            if (decoded.role?.toUpperCase() === "VENDOR") {
                navigate("/purchase/vendor-pos", {
                    replace: true
                });
                return;
            }
        } catch (e) {
            console.error("Error decoding token on login:", e);
        }

        navigate("/dashboard", {
            replace: true
        });

    } catch (err) {

        setError(
            err.message || "Invalid username or password"
        );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <h1 className="auth-title">SCM System Login</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin"
              required
            />
          </div>
          {error && <p style={{ color: 'red', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary">Login</button>
        </form>
      </div>
    </div>
  );
}
