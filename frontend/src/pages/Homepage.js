import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Homepage.css";
import TodaysBreakdown from "../components/TodaysBreakdown";
import PlateCalculator from "../components/PlateCalculator";

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
    // Clear the token from browser storage
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className={`homepage ${isDark ? "homepage--dark" : ""}`}>
      <nav className="homepage-nav">
        <span className="homepage-nav-date">{dateString}</span>
        <span className="homepage-nav-greeting">Hi, {USER_NAME}!</span>
        <div className="homepage-nav-actions">
          <Link
            to="/plan/new"
            className="homepage-nav-btn homepage-nav-link"
          >
            Create a plan
          </Link>
          <Link
            to="/workout/new"
            className="homepage-nav-btn homepage-nav-link"
          >
            New workout
          </Link>
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
          <TodaysBreakdown isDark={isDark} />
        </section>
        <section className="homepage-section">
          <h2 className="homepage-section-title">My Progress</h2>
        </section>
        <section className="homepage-section">
          <h2 className="homepage-section-title">Weekly Calendar</h2>
        </section>
        <section className="homepage-section">
          <PlateCalculator isDark={isDark} />
        </section>
      </main>
    </div>
  );
}

export default Homepage;
