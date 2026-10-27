import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addWeight, listWeights } from "../api/accountApi";
import { formatHeight, formatWeight, weightFromLb, weightToLb, weightUnit } from "../utils/units";
import "./BodyCard.css";

// BMI bands shown on the scale (the ends are clamped for display)
const BMI_MIN = 15;
const BMI_MAX = 40;
const BMI_BANDS = [
  { label: "Under", from: BMI_MIN, to: 18.5 },
  { label: "Healthy", from: 18.5, to: 25 },
  { label: "Over", from: 25, to: 30 },
  { label: "Obese", from: 30, to: BMI_MAX },
];

function shortDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Weight over time as a single line; newest point marked. */
function Sparkline({ entries, unitSystem }) {
  const W = 280;
  const H = 64;
  const pad = 6;
  if (entries.length < 2) return null;
  const values = entries.map((e) => weightFromLb(e.weight, unitSystem));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - pad * 2)) / (entries.length - 1);
  const y = (v) => H - pad - ((v - min) / span) * (H - pad * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;
  const first = entries[0];
  const latest = entries[last];
  return (
    <figure className="body-spark">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Weight from ${shortDate(first.recorded_on)} to ${shortDate(latest.recorded_on)}: ${values[0]} to ${values[last]} ${weightUnit(unitSystem)}`}
        preserveAspectRatio="none"
      >
        <polyline className="body-spark-line" points={points} />
        <circle className="body-spark-dot" cx={x(last)} cy={y(values[last])} r="4" />
      </svg>
      <figcaption>
        <span>{shortDate(first.recorded_on)}</span>
        <span>{shortDate(latest.recorded_on)}</span>
      </figcaption>
    </figure>
  );
}

function BmiScale({ bmi, category }) {
  if (bmi == null) return null;
  const clamp = Math.min(BMI_MAX, Math.max(BMI_MIN, bmi));
  const pos = ((clamp - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100;
  return (
    <div className="body-bmi">
      <div className="body-row">
        <span className="body-label">BMI</span>
        <span className="body-bmi-value">
          <span className="f-num">{bmi}</span> {category ? category.toLowerCase() : ""}
        </span>
      </div>
      <div className="body-bmi-track" aria-hidden="true">
        {BMI_BANDS.map((b) => (
          <span
            key={b.label}
            className={`body-bmi-band ${clamp >= b.from && clamp < b.to + (b.to === BMI_MAX ? 1 : 0) ? "body-bmi-band--on" : ""}`}
            style={{ flexGrow: b.to - b.from }}
          />
        ))}
        <span className="body-bmi-marker" style={{ left: `${pos}%` }} />
      </div>
      <div className="body-bmi-labels" aria-hidden="true">
        {BMI_BANDS.map((b) => (
          <span key={b.label} style={{ flexGrow: b.to - b.from }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Homepage body panel: weight trend, quick weigh-in, goal progress and BMI. */
function BodyCard({ profile, onChanged }) {
  const unitSystem = profile?.unit_system || "imperial";
  const unit = weightUnit(unitSystem);
  const [entries, setEntries] = useState([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const loadEntries = useCallback(
    () => listWeights().then((list) => setEntries([...list].reverse().slice(-12))).catch(() => setEntries([])),
    []
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries, profile?.weight]);

  const log = async (e) => {
    e.preventDefault();
    setNote(null);
    const lb = weightToLb(value, unitSystem);
    if (lb == null || lb < 20 || lb > 1000) {
      setNote({ ok: false, text: `Enter your weight in ${unit}.` });
      return;
    }
    setBusy(true);
    try {
      await addWeight(lb);
      setValue("");
      setNote({ ok: true, text: `Logged ${formatWeight(lb, unitSystem)} for today.` });
      await loadEntries();
      onChanged?.();
    } catch (err) {
      setNote({ ok: false, text: err.message });
    }
    setBusy(false);
  };

  const goal = useMemo(() => {
    if (!profile?.goal_weight || !profile?.weight) return null;
    const start = entries.length ? entries[0].weight : profile.weight;
    const total = Math.abs(start - profile.goal_weight);
    const done = Math.abs(start - profile.weight);
    const left = Math.abs(profile.weight - profile.goal_weight);
    const towardGoal = Math.sign(profile.goal_weight - start) === Math.sign(profile.weight - start) || done === 0;
    const share = total === 0 ? 1 : towardGoal ? Math.min(1, done / total) : 0;
    return { share, left };
  }, [entries, profile?.goal_weight, profile?.weight]);

  let change = null;
  if (profile?.weight != null && profile?.previous_weight != null) {
    const diff = weightFromLb(profile.weight, unitSystem) - weightFromLb(profile.previous_weight, unitSystem);
    const rounded = Math.round(Math.abs(diff) * 10) / 10;
    const since = entries.length > 1 ? ` since ${shortDate(entries[entries.length - 2].recorded_on)}` : "";
    change = diff === 0 ? `No change${since}` : `${diff > 0 ? "Up" : "Down"} ${rounded} ${unit}${since}`;
  }

  return (
    <section className="home-panel body-card" aria-labelledby="body-title">
      <div className="home-row-head">
        <h2 id="body-title" className="homepage-section-title">
          Body
        </h2>
        <Link to="/settings#profile" className="f-link body-edit">
          Edit
        </Link>
      </div>

      {profile?.weight ? (
        <div className="body-weight">
          <span className="body-weight-num f-num">
            {weightFromLb(profile.weight, unitSystem)}
            <span className="body-weight-unit">{unit}</span>
          </span>
          {change ? <span className="body-weight-change">{change}</span> : null}
        </div>
      ) : (
        <p className="body-empty">Log your weight to start a trend line.</p>
      )}

      <Sparkline entries={entries} unitSystem={unitSystem} />

      <form className="body-log" onSubmit={log} noValidate>
        <label className="f-visually-hidden" htmlFor="body-log-input">
          Today's weight in {unit}
        </label>
        <input
          id="body-log-input"
          className="f-input"
          inputMode="decimal"
          placeholder={`Today's weight (${unit})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="f-btn f-btn--quiet" disabled={busy}>
          {busy ? "Logging…" : "Log"}
        </button>
      </form>
      {note ? (
        <p className={`body-note ${note.ok ? "body-note--ok" : ""}`} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      ) : null}

      {goal ? (
        <div className="body-goal">
          <div className="body-row">
            <span className="body-label">Goal {formatWeight(profile.goal_weight, unitSystem)}</span>
            <span className="body-goal-left">
              {goal.left < 0.05 ? "Reached" : `${formatWeight(goal.left, unitSystem)} to go`}
            </span>
          </div>
          <div
            className="body-goal-track"
            role="progressbar"
            aria-label="Progress toward goal weight"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(goal.share * 100)}
          >
            <span className="body-goal-fill" style={{ width: `${goal.share * 100}%` }} />
          </div>
        </div>
      ) : profile?.weight ? (
        <p className="body-empty">
          <Link to="/settings#profile">Set a goal weight</Link> to track progress toward it.
        </p>
      ) : null}

      <BmiScale bmi={profile?.bmi} category={profile?.bmi_category} />

      {profile?.height ? (
        <p className="body-foot">
          Height {formatHeight(profile.height, unitSystem)}
          {profile.age != null ? `, age ${profile.age}` : ""}
        </p>
      ) : (
        <p className="body-empty">
          Add your height in <Link to="/settings#profile">Settings</Link> to see your BMI.
        </p>
      )}
    </section>
  );
}

export default BodyCard;
