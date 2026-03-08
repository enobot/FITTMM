import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Homepage.css";

const USER_NAME = "Tracy"; // TODO: get from auth/session

function Homepage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  const dateString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className={`homepage ${isDark ? "homepage--dark" : ""}`}>
      <nav className="homepage-nav">
        <span className="homepage-nav-date">{dateString}</span>
        <span className="homepage-nav-greeting">Hi, {USER_NAME}!</span>
        <div className="homepage-nav-actions">
          <button
            type="button"
            className="homepage-nav-btn"
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <span className="homepage-nav-icon" aria-hidden>☀</span>
            ) : (
              <span className="homepage-nav-icon" aria-hidden>☾</span>
            )}
          </button>
          <button
            type="button"
            className="homepage-nav-btn"
            title="Settings"
            aria-label="Settings"
          >
            <span className="homepage-nav-icon" aria-hidden>⚙</span>
          </button>
          <button
            type="button"
            className="homepage-nav-btn homepage-nav-logout"
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="homepage-main">
        <section className="homepage-section">
          <h2 className="homepage-section-title">Today's breakdown</h2>
        </section>
        <section className="homepage-section">
          <h2 className="homepage-section-title">My Progress</h2>
        </section>
        <section className="homepage-section">
          <h2 className="homepage-section-title">Weekly Calendar</h2>
        </section>
        <section className="homepage-section">
          <h2 className="homepage-section-title">Monthly Calendar</h2>
        </section>
      </main>
    </div>
  );
}

export default Homepage;
