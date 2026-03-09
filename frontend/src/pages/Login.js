import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const formData = new URLSearchParams();
    formData.append("username", email); // FastAPI OAuth2 uses 'username'
    formData.append("password", password);

    try {
      const response = await fetch("http://localhost:8000/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Save token to browser storage
        localStorage.setItem("token", data.access_token);
        navigate("/homepage");
      } else {
        setError("Incorrect email or password.");
      }
    } catch (err) {
      setError("Could not connect to the server. Please try again later.");
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
