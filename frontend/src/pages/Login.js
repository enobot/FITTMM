import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../apiConfig";
import { applyUserSession } from "../utils/fittmmStorage";
import { fetchWithTimeout } from "../api/workoutApi";
import "./Login.css";

const LOGIN_FETCH_MS = 30000;

function parseLoginError(response, rawBody, fallback) {
  if (!rawBody) return fallback;
  try {
    const data = JSON.parse(rawBody);
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail))
      return data.detail.map((x) => x.msg || JSON.stringify(x)).join(" ");
  } catch (_) {}
  return fallback;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm || !password) {
      setError("Please enter email and password.");
      return;
    }

    const formData = new URLSearchParams();
    formData.append("username", emailNorm); // FastAPI OAuth2 uses 'username'
    formData.append("password", password);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        },
        LOGIN_FETCH_MS
      );

      const raw = await response.text();

      if (response.ok) {
        let data;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch (_) {
          setError("Invalid response from server.");
          return;
        }
        localStorage.setItem("token", data.access_token);

        try {
          const meRes = await fetchWithTimeout(
            `${API_BASE_URL}/auth/me`,
            {
              headers: { Authorization: `Bearer ${data.access_token}` },
            },
            LOGIN_FETCH_MS
          );
          if (meRes.ok) {
            const meRaw = await meRes.text();
            const me = meRaw ? JSON.parse(meRaw) : {};
            applyUserSession(me);
          }
        } catch (_) {
          /* profile sync can finish on homepage */
        }
        navigate("/homepage");
        return;
      }

      const fallback =
        response.status === 401
          ? "Incorrect email or password."
          : `Could not log in (${response.status}).`;
      setError(parseLoginError(response, raw, fallback));
    } catch (err) {
      const hint =
        API_BASE_URL === ""
          ? " Start the API on port 8000 and use npm start (proxy)."
          : ` API URL: ${API_BASE_URL}.`;
      setError(
        (err?.message || "Could not connect to the server.") +
          hint
      );
    }
  };

  return (
    <div className="login-page">
      <p className="login-quote">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <div className="login-center">
        <div className="login-brand">FITTMM</div>
        <div className="login-box">
        <h1>Login</h1>
        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Log In</button>

          <p className="login-signup-prompt">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
      </div>
    </div>
  );
}

export default Login;
