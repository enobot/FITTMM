import React from "react";

function Login() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 350 }}>
        <h1>Login</h1>

        <form>
          <input
            type="email"
            placeholder="Email"
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <input
            type="password"
            placeholder="Password"
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />

          <button style={{ width: "100%", padding: 10 }}>
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;