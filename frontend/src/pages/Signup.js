import React from "react";
import { Link } from "react-router-dom";
import "./Signup.css";

function Signup() {
  return (
    <div className="signup-page">
      <div className="signup-box">
        <h1>Sign up</h1>
        <p>Sign up page – coming soon.</p>
        <Link to="/">Back to Login</Link>
      </div>
    </div>
  );
}

export default Signup;
