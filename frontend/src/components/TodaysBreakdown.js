import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./TodaysBreakdown.css";
import { setScopedItem, K } from "../utils/fittmmStorage";
import { localDateString } from "../api/accountApi";
import { formatVolume, formatWeight, weightUnit } from "../utils/units";

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The calendar date (this week) of a weekday name. */
function dateThisWeek(dayName) {
  const today = new Date();
  const shown = new Date(today);
  shown.setDate(today.getDate() + (DAY_ORDER.indexOf(dayName) - today.getDay()));
  return shown;
}

/** The day a logged session happened, on the user's own calendar. */
function sessionDay(session) {
  const p = session.payload || {};
  if (typeof p.local_date === "string") return p.local_date.slice(0, 10);
  const raw = p.date || (session.logged_at ? `${session.logged_at}Z` : null);
  const when = raw ? new Date(raw) : null;
  return when && !Number.isNaN(when.getTime()) ? localDateString(when) : null;
}

/** "2 × 5 at 185 lb" lines, grouping consecutive identical sets. */
function setLines(sets, unitSystem) {
  const lines = [];
  sets.forEach((s) => {
    const reps = Number(s.reps) || 0;
    const weight = Number(s.weightLbs ?? s.weight) || 0;
    const last = lines[lines.length - 1];
    if (last && last.reps === reps && last.weight === weight) last.count += 1;
    else lines.push({ count: 1, reps, weight });
  });
  return lines.map((l) =>
    l.weight > 0
      ? `${l.count} × ${l.reps} at ${formatWeight(l.weight, unitSystem)}`
      : `${l.count} × ${l.reps} reps`
  );
}

function TodaysBreakdown({
  selectedDay,
  planSelections = {},
  sessions = [],
  planLoading = false,
  sessionsLoading = false,
  photoFor = () => null,
  unitSystem = "imperial",
}) {
  const navigate = useNavigate();
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dayName = selectedDay || todayName;
  const displayDate = useMemo(() => dateThisWeek(dayName), [dayName]);
  const loading = planLoading || sessionsLoading;

  const parsed = planSelections || {};
  const hasAnySelections = Object.values(parsed).some((items) => Array.isArray(items) && items.length > 0);
  const planned = useMemo(
    () => (Array.isArray(planSelections?.[dayName]) ? planSelections[dayName] : []),
    [planSelections, dayName]
  );
  const isRestDay = hasAnySelections && planned.length === 0;

  // Everything logged on that date, from the website and the phone alike
  const logged = useMemo(() => {
    const key = localDateString(displayDate);
    const byName = new Map();
    (sessions || [])
      .filter((s) => sessionDay(s) === key)
      .sort((a, b) => String(a.logged_at).localeCompare(String(b.logged_at)))
      .forEach((s) => {
        (s.payload?.exercises || []).forEach((ex) => {
          const name = String(ex.name || "").trim();
          if (!name) return;
          const sets = (Array.isArray(ex.sets) ? ex.sets : []).filter((r) => Number(r.reps) > 0);
          const k = name.toLowerCase();
          if (!byName.has(k)) byName.set(k, { name, sets: [] });
          byName.get(k).sets.push(...sets);
        });
      });
    return byName;
  }, [sessions, displayDate]);

  const rows = useMemo(() => {
    const seen = new Set();
    const list = planned.map((name) => {
      seen.add(name.toLowerCase());
      return { name, sets: logged.get(name.toLowerCase())?.sets || [] };
    });
    logged.forEach((entry, k) => {
      if (!seen.has(k) && entry.sets.length) list.push(entry);
    });
    return list;
  }, [planned, logged]);

  const goRecord = () => {
    setScopedItem(K.SELECTED_DAY, dayName);
    navigate("/recordWorkout");
  };

  const title = dayName === todayName ? "Today's session" : `${dayName}'s session`;
  const dateLabel = displayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const header = (action) => (
    <header className="session-head">
      <div>
        <h2 className="homepage-section-title">{title}</h2>
        <p className="session-date">{dateLabel}</p>
      </div>
      {action}
    </header>
  );

  if (loading) {
    return (
      <div className="session">
        {header(null)}
        <p className="session-note" role="status">Loading…</p>
      </div>
    );
  }

  if (!hasAnySelections && rows.length === 0) {
    return (
      <div className="session">
        {header(null)}
        <p className="session-note">
          *crickets* Uh oh :( it doesn't look like you have a workout plan!
          <br />
          Would you like to create one?
        </p>
        <div className="session-actions">
          <button type="button" className="f-btn f-btn--primary" onClick={() => navigate("/plan/new")}>
            Yes!
          </button>
          <button type="button" className="f-btn f-btn--quiet" onClick={() => navigate("/plan/new")}>
            No...jk yes
          </button>
        </div>
      </div>
    );
  }

  if (isRestDay && rows.length === 0) {
    return (
      <div className="session">
        {header(null)}
        <p className="session-note">It&apos;s your rest day! Take a break!</p>
      </div>
    );
  }

  const unit = weightUnit(unitSystem);
  const dayTotal = rows.reduce(
    (sum, r) => sum + r.sets.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weightLbs ?? set.weight) || 0), 0),
    0
  );
  const anyLogged = rows.some((r) => r.sets.length > 0);

  return (
    <div className="session">
      {header(
        <button type="button" className="f-btn f-btn--quiet session-record" onClick={goRecord}>
          {anyLogged ? "Add sets" : "Record sets"}
        </button>
      )}

      <ul className="session-list">
        {rows.map((row) => {
          const volume = row.sets.reduce(
            (s, set) => s + (Number(set.reps) || 0) * (Number(set.weightLbs ?? set.weight) || 0),
            0
          );
          const photo = photoFor(row.name);
          return (
            <li key={row.name} className="session-row">
              <span className="session-photo">
                {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="f-display">{row.name[0]}</span>}
              </span>
              <span className="session-main">
                <span className="session-name">{row.name}</span>
                {row.sets.length ? (
                  setLines(row.sets, unitSystem).map((line) => (
                    <span key={line} className="session-sets">
                      {line}
                    </span>
                  ))
                ) : (
                  <span className="session-sets session-sets--todo">Not logged yet</span>
                )}
              </span>
              <span className="session-volume">
                {row.sets.length ? (
                  <>
                    <span className="f-num">{formatVolume(volume, unitSystem)}</span>
                    <span className="session-volume-unit">{unit}</span>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {anyLogged ? (
        <p className="session-total">
          Day total <span className="f-num">{formatVolume(dayTotal, unitSystem)}</span> {unit}
        </p>
      ) : null}
    </div>
  );
}

export default TodaysBreakdown;
