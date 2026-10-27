import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Homepage.css";
import TopNav from "../components/TopNav";
import PlateStack from "../components/PlateStack";
import TodaysBreakdown from "../components/TodaysBreakdown";
import PlateCalculator from "../components/PlateCalculator";
import MyProgress from "../components/MyProgress";
import BodyCard from "../components/BodyCard";
import { fetchSessions } from "../api/workoutApi";
import { getProfile, getVolume, localDateString } from "../api/accountApi";
import { useWorkoutPlan } from "../hooks/useWorkoutPlan";
import { useExerciseCatalog, nameKey } from "../hooks/useExerciseCatalog";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme";
import { formatVolume, weightUnit } from "../utils/units";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/** This week's training days as plates in day order; thicker plate = more volume. */
function weekPlates(volume, unitSystem) {
  if (!volume?.daily) return [];
  const start = localDateString(startOfWeek());
  const days = volume.daily.filter((d) => d.date >= start && d.volume > 0);
  if (!days.length) return [];
  const max = Math.max(...days.map((d) => d.volume));
  return days.map((d) => {
    const share = d.volume / max;
    const [y, m, day] = d.date.split("-").map(Number);
    const label = new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "short" });
    return {
      key: d.date,
      color: "var(--action)",
      thickness: Math.round(12 + 26 * share),
      height: share < 0.35 ? 130 : 190,
      label,
      title: `${label}: ${formatVolume(d.volume, unitSystem)} ${weightUnit(unitSystem)}`,
    };
  });
}

function Homepage() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const { isDark } = useTheme();
  const { selections: planSelections, loading: planLoading } = useWorkoutPlan();
  const { byName } = useExerciseCatalog();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [volume, setVolume] = useState(null);
  const [profile, setProfile] = useState(null);

  const reloadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      setSessions(await fetchSessions());
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const reloadProfile = useCallback(
    () => getProfile().then(setProfile).catch(() => setProfile(null)),
    []
  );

  useEffect(() => {
    reloadSessions();
    getVolume(14).then(setVolume).catch(() => setVolume(null));
    reloadProfile();
  }, [reloadSessions, reloadProfile, me?.id]);

  const unitSystem = profile?.unit_system || "imperial";

  const dateString = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    []
  );
  const todayName = useMemo(() => new Date().toLocaleDateString("en-US", { weekday: "long" }), []);
  const [selectedBreakdownDay, setSelectedBreakdownDay] = useState(todayName);

  const weeklyPlan = useMemo(() => {
    const parsed = planSelections || {};
    const hasAnySelections = Object.values(parsed).some((items) => Array.isArray(items) && items.length > 0);
    return WEEK_DAYS.map((day) => ({
      day,
      short: day.slice(0, 3),
      exercises: Array.isArray(parsed[day]) ? parsed[day] : [],
      hasAnySelections,
    }));
  }, [planSelections]);

  const loggedThisWeek = useMemo(() => {
    const done = new Set();
    const start = localDateString(startOfWeek());
    (volume?.daily || []).forEach((d) => {
      if (d.date >= start && d.volume > 0) {
        const [y, m, day] = d.date.split("-").map(Number);
        done.add(WEEK_DAYS[new Date(y, m - 1, day).getDay()]);
      }
    });
    return done;
  }, [volume]);

  const plates = useMemo(() => weekPlates(volume, unitSystem), [volume, unitSystem]);
  const photoFor = useCallback((name) => byName.get(nameKey(name))?.image || null, [byName]);

  const todays = weeklyPlan.find((d) => d.day === todayName);
  const hasPlan = weeklyPlan.some((d) => d.exercises.length > 0);
  const firstName = me?.fname?.trim() || profile?.fname || "";

  let todayLine;
  if (planLoading) todayLine = "Loading today's plan…";
  else if (!hasPlan) todayLine = "You don't have a weekly plan yet. Build one to see each day's lifts here.";
  else if (!todays?.exercises.length) todayLine = "Rest day. Recovery is part of the plan.";
  else if (loggedThisWeek.has(todayName)) todayLine = `Today's ${todays.exercises.length} lifts are logged. Nice work.`;
  else todayLine = `Today: ${todays.exercises.slice(0, 3).join(", ")}${todays.exercises.length > 3 ? ` and ${todays.exercises.length - 3} more` : ""}.`;

  const thisWeek = volume?.this_week || 0;
  const lastWeek = volume?.last_week || 0;
  let delta = null;
  if (lastWeek > 0) {
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    delta = `${pct >= 0 ? "+" : ""}${pct}% vs last week (${formatVolume(lastWeek, unitSystem)} ${weightUnit(unitSystem)})`;
  } else if (thisWeek > 0) {
    delta = "First logged week. This is your baseline.";
  }

  return (
    <div className={`homepage ${isDark ? "homepage--dark" : ""}`}>
      <TopNav />

      <main className="home">
        <section className="home-hero" aria-labelledby="home-hello">
          <div className="home-hello">
            <p className="home-date">{dateString}</p>
            <h1 id="home-hello" className="f-display home-hi">
              {firstName ? `Hi, ${firstName}` : "Hi there"}
            </h1>
            <p className="home-today">{todayLine}</p>
            <div className="home-hero-actions">
              {hasPlan && todays?.exercises.length ? (
                <Link to="/recordWorkout" className="f-btn f-btn--primary">
                  Record today's workout
                </Link>
              ) : (
                <Link to="/plan/new" className="f-btn f-btn--primary">
                  {hasPlan ? "Edit your plan" : "Build your plan"}
                </Link>
              )}
              <Link to="/exercises" className="f-btn f-btn--quiet">
                Browse exercises
              </Link>
            </div>
          </div>

          <Link to="/volume" className="home-load" aria-label="This week's volume. Open the volume page.">
            <span className="home-load-label">This week's volume</span>
            <span className="home-load-num f-num">
              {formatVolume(thisWeek, unitSystem)}
              <span className="home-load-unit">{weightUnit(unitSystem)}</span>
            </span>
            <span className="home-load-delta">{delta || "Log a workout to start loading the bar."}</span>
            <PlateStack
              plates={plates}
              minWidth={520}
              className="home-load-bar"
              title={
                plates.length
                  ? `Training days this week: ${plates.map((p) => p.title).join("; ")}`
                  : "No training logged this week"
              }
            />
          </Link>
        </section>

        <section className="home-week" aria-labelledby="home-week-title">
          <div className="home-row-head">
            <h2 id="home-week-title" className="homepage-section-title">
              This week
            </h2>
            <button
              type="button"
              className="f-link"
              onClick={() => navigate("/listOfExercises", { state: { source: "weekly-edit" } })}
            >
              Edit plan
            </button>
          </div>
          <div className="home-week-grid">
            {weeklyPlan.map((slot) => {
              const isToday = slot.day === todayName;
              const isSelected = slot.day === selectedBreakdownDay;
              const done = loggedThisWeek.has(slot.day);
              return (
                <button
                  type="button"
                  key={slot.day}
                  className={`home-day ${isToday ? "home-day--today" : ""} ${isSelected ? "home-day--selected" : ""}`}
                  onClick={() => setSelectedBreakdownDay(slot.day)}
                  aria-pressed={isSelected}
                  aria-label={`${slot.day}${isToday ? ", today" : ""}${done ? ", logged" : ""}. Show in today's breakdown.`}
                >
                  <span className="home-day-name">
                    {slot.short}
                    {done ? <span className="home-day-done" aria-hidden="true">✓</span> : null}
                  </span>
                  {!slot.hasAnySelections ? null : slot.exercises.length === 0 ? (
                    <span className="home-day-rest">Rest</span>
                  ) : (
                    <ul className="home-day-list">
                      {slot.exercises.map((exercise) => (
                        <li key={`${slot.day}-${exercise}`}>{exercise}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Main column for training, side column for body and tools; each stacks on its own */}
        <div className="home-lower">
          <div className="home-main">
            <section className="home-panel" aria-label="Session">
              <TodaysBreakdown
                selectedDay={selectedBreakdownDay}
                planSelections={planSelections}
                sessions={sessions}
                planLoading={planLoading}
                sessionsLoading={sessionsLoading}
                photoFor={photoFor}
                unitSystem={unitSystem}
              />
            </section>
            <section className="home-panel">
              <MyProgress sessions={sessions} sessionsLoading={sessionsLoading} />
            </section>
          </div>
          <aside className="home-rail" aria-label="Body and tools">
            <BodyCard profile={profile} onChanged={reloadProfile} />
            <section className="home-panel">
              <PlateCalculator isDark={isDark} />
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Homepage;
