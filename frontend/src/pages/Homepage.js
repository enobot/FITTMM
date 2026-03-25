import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Homepage.css";
import TodaysBreakdown from "../components/TodaysBreakdown";
import PlateCalculator from "../components/PlateCalculator";

const USER_NAME = "Tracy"; // TODO: get from auth/session
const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  const todayName = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long" }),
    []
  );

  const weeklyPlan = useMemo(() => {
    try {
      const raw = localStorage.getItem("fittmm_plan_day_selections");
      const parsed = raw ? JSON.parse(raw) : {};
      const hasAnySelections = Object.values(parsed).some(
        (items) => Array.isArray(items) && items.length > 0
      );
      return WEEK_DAYS.map((day) => ({
        day,
        short: day.slice(0, 3),
        exercises: Array.isArray(parsed[day]) ? parsed[day] : [],
        hasAnySelections,
      }));
    } catch {
      return WEEK_DAYS.map((day) => ({
        day,
        short: day.slice(0, 3),
        exercises: [],
        hasAnySelections: false,
      }));
    }
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
          <h2 className="homepage-section-title">Weekly</h2>
          <div className="homepage-weekly">
            <div className="homepage-weekly-grid">
              {weeklyPlan.map((slot) => (
                <article
                  key={slot.day}
                  className={`homepage-weekly-day ${
                    slot.day === todayName ? "homepage-weekly-day--current" : ""
                  }`}
                >
                  <h3 className="homepage-weekly-day-title">{slot.short}</h3>
                  {!slot.hasAnySelections ? null : slot.exercises.length === 0 ? (
                    <p className="homepage-weekly-rest">REST</p>
                  ) : (
                    <ul className="homepage-weekly-list">
                      {slot.exercises.map((exercise) => (
                        <li key={`${slot.day}-${exercise}`} className="homepage-weekly-item">
                          {exercise}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="homepage-section">
          <PlateCalculator isDark={isDark} />
        </section>
      </main>
    </div>
  );
}

export default Homepage;
