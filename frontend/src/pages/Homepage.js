import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Homepage.css";
import TodaysBreakdown from "../components/TodaysBreakdown";
import PlateCalculator from "../components/PlateCalculator";
import MyProgress from "../components/MyProgress";
import { API_BASE_URL } from "../apiConfig";
import { fetchSessions } from "../api/workoutApi";
import { useWorkoutPlan } from "../hooks/useWorkoutPlan";
import {
  getStoredUser,
  clearUserSession,
  applyUserSession,
  clearAllLocalUserData,
} from "../utils/fittmmStorage";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Homepage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [sessionUser, setSessionUser] = useState(() => getStoredUser());
  const { selections: planSelections, loading: planLoading, reload: reloadPlan } =
    useWorkoutPlan();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const settingsWrapRef = useRef(null);

  const reloadSessions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    try {
      const list = await fetchSessions();
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    function handlePointerDown(e) {
      if (!settingsMenuOpen) return;
      if (settingsWrapRef.current && !settingsWrapRef.current.contains(e.target)) {
        setSettingsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [settingsMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function syncProfile() {
      const token = localStorage.getItem("token");
      if (!token) {
        if (!cancelled) setSessionUser(null);
        return;
      }
      if (getStoredUser()) {
        if (!cancelled) setSessionUser(getStoredUser());
        return;
      }
      try {
        const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          applyUserSession(me);
          if (!cancelled) setSessionUser(getStoredUser());
        }
      } catch {
        if (!cancelled) setSessionUser(getStoredUser());
      }
    }

    syncProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    reloadSessions();
  }, [sessionUser?.id, reloadSessions]);

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
  const [selectedBreakdownDay, setSelectedBreakdownDay] = useState(todayName);

  const weeklyPlan = useMemo(() => {
    const parsed = planSelections || {};
    const hasAnySelections = Object.values(parsed).some(
      (items) => Array.isArray(items) && items.length > 0
    );
    return WEEK_DAYS.map((day) => ({
      day,
      short: day.slice(0, 3),
      exercises: Array.isArray(parsed[day]) ? parsed[day] : [],
      hasAnySelections,
    }));
  }, [planSelections]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearUserSession();
    navigate("/");
  };

  const confirmRemoveAllData = async () => {
    const token = localStorage.getItem("token");
    const uid = getStoredUser()?.id;
    if (!token || uid == null) return;
    setWiping(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/data`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let detail = "Could not remove data.";
        try {
          const err = await res.json();
          if (typeof err.detail === "string") detail = err.detail;
        } catch (_) {}
        throw new Error(detail);
      }
      clearAllLocalUserData(uid);
      await reloadPlan();
      await reloadSessions();
      setWipeConfirmOpen(false);
      setSettingsMenuOpen(false);
    } catch (e) {
      const raw = e?.message || "";
      let hint = "";
      if (
        raw === "Failed to fetch" ||
        raw === "NetworkError when attempting to fetch resource."
      ) {
        hint =
          API_BASE_URL === ""
            ? " Could not reach the API. Start the backend (uvicorn on port 8000), ensure package.json has \"proxy\" pointing at it, then restart npm start."
            : ` Could not reach ${API_BASE_URL}. Is the API running?`;
      }
      alert((raw || "Could not remove data.") + hint);
    } finally {
      setWiping(false);
    }
  };

  const displayName = sessionUser?.fname?.trim() || "there";

  return (
    <div className={`homepage ${isDark ? "homepage--dark" : ""}`}>
      <nav className="homepage-nav">
        <span className="homepage-nav-date">{dateString}</span>
        <span className="homepage-nav-greeting">Hi, {displayName}!</span>
        <div className="homepage-nav-actions">
          <Link
            to="/plan/new"
            className="homepage-nav-btn homepage-nav-link"
          >
            Create a plan
          </Link>
          <button
            type="button"
            className={`homepage-nav-btn homepage-nav-theme-toggle ${
              isDark ? "homepage-nav-theme-toggle--dark" : "homepage-nav-theme-toggle--light"
            }`}
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
          <div className="homepage-settings-wrap" ref={settingsWrapRef}>
            <button
              type="button"
              className="homepage-nav-btn"
              title="Settings"
              aria-label="Settings"
              aria-haspopup="true"
              aria-expanded={settingsMenuOpen}
              onClick={() => setSettingsMenuOpen((o) => !o)}
            >
              <span className="homepage-nav-icon" aria-hidden>⚙</span>
            </button>
            {settingsMenuOpen ? (
              <div className="homepage-settings-menu" role="menu">
                <button
                  type="button"
                  className="homepage-settings-menu-item homepage-settings-menu-item--danger"
                  role="menuitem"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setWipeConfirmOpen(true);
                  }}
                >
                  Remove all data
                </button>
              </div>
            ) : null}
          </div>
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
        <section className="homepage-section homepage-section--todays">
          <TodaysBreakdown
            selectedDay={selectedBreakdownDay}
            planSelections={planSelections}
            sessions={sessions}
            planLoading={planLoading}
            sessionsLoading={sessionsLoading}
          />
        </section>
        <section className="homepage-section">
          <MyProgress sessions={sessions} sessionsLoading={sessionsLoading} />
        </section>
        <section className="homepage-section homepage-section--weekly">
          <h2 className="homepage-section-title">Weekly</h2>
          <div className="homepage-weekly">
            <div className="homepage-weekly-grid">
              {weeklyPlan.map((slot) => (
                <button
                  type="button"
                  key={slot.day}
                  className={`homepage-weekly-day ${
                    slot.day === todayName ? "homepage-weekly-day--current" : ""
                  } ${
                    slot.day === selectedBreakdownDay ? "homepage-weekly-day--selected" : ""
                  }`}
                  onClick={() => setSelectedBreakdownDay(slot.day)}
                  aria-label={`Show ${slot.day} workout in Today's Breakdown`}
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
                </button>
              ))}
              <button
                type="button"
                className="homepage-weekly-day homepage-weekly-edit-tile"
                onClick={() =>
                  navigate("/listOfExercises", { state: { source: "weekly-edit" } })
                }
                aria-label="Edit weekly plan"
              >
                <span className="homepage-weekly-edit-label">Edit</span>
              </button>
            </div>
          </div>
        </section>
        <section className="homepage-section">
          <PlateCalculator isDark={isDark} />
        </section>
      </main>

      {wipeConfirmOpen ? (
        <div
          className="homepage-modal-overlay"
          role="presentation"
          onClick={() => !wiping && setWipeConfirmOpen(false)}
        >
          <div
            className="homepage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepage-wipe-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="homepage-wipe-title" className="homepage-modal-title">
              Remove all data?
            </h2>
            <p className="homepage-modal-body">
              Are you sure you want to remove all data?
            </p>
            <div className="homepage-modal-actions">
              <button
                type="button"
                className="homepage-modal-btn homepage-modal-btn--secondary"
                onClick={() => !wiping && setWipeConfirmOpen(false)}
                disabled={wiping}
              >
                No
              </button>
              <button
                type="button"
                className="homepage-modal-btn homepage-modal-btn--danger"
                onClick={confirmRemoveAllData}
                disabled={wiping}
              >
                {wiping ? "Removing…" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Homepage;
