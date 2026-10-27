import React, { useState } from "react";
import {
  CM_PER_IN,
  ageFrom,
  heightParts,
  heightToIn,
  weightFromLb,
  weightToLb,
  weightUnit,
} from "../utils/units";
import "./ProfileForm.css";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer not to say", label: "Prefer not to say" },
];

function initialState(p = {}) {
  const unit = p.unit_system || "imperial";
  const { feet, inches } = heightParts(p.height);
  return {
    fname: p.fname || "",
    lname: p.lname || "",
    date_of_birth: p.date_of_birth || "",
    gender: p.gender || "",
    unit,
    feet: feet === "" ? "" : String(feet),
    inches: inches === "" ? "" : String(inches),
    cm: p.height ? String(Math.round(p.height * CM_PER_IN)) : "",
    weight: p.weight != null ? String(weightFromLb(p.weight, unit)) : "",
    goal: p.goal_weight != null ? String(weightFromLb(p.goal_weight, unit)) : "",
  };
}

/** Profile fields in the user's units. onSubmit receives API-ready changes (lb, in). */
function ProfileForm({ profile, onSubmit, submitLabel = "Save changes", secondary, busy, showNames = true }) {
  const [f, setF] = useState(() => initialState(profile));
  const [weightTouched, setWeightTouched] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.value }));

  const switchUnits = (unit) => {
    if (unit === f.unit) return;
    setF((s) => {
      const inches = heightToIn(s, s.unit);
      const { feet, inches: rest } = heightParts(inches);
      const convert = (v) => {
        const lb = weightToLb(v, s.unit);
        return lb == null ? "" : String(weightFromLb(lb, unit));
      };
      return {
        ...s,
        unit,
        feet: inches ? String(feet) : "",
        inches: inches ? String(rest) : "",
        cm: inches ? String(Math.round(inches * CM_PER_IN)) : "",
        weight: convert(s.weight),
        goal: convert(s.goal),
      };
    });
  };

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (showNames && !f.fname.trim()) {
      setError("Enter your first name.");
      return;
    }
    if (f.date_of_birth) {
      const age = ageFrom(f.date_of_birth);
      if (age == null || age < 13 || age > 120) {
        setError("Enter a real birthday. You must be 13 or older.");
        return;
      }
    }
    const height = heightToIn(f, f.unit);
    if (height != null && (height < 20 || height > 108)) {
      setError("Height looks off. Check the numbers and units.");
      return;
    }
    const weight = weightToLb(f.weight, f.unit);
    const goal = weightToLb(f.goal, f.unit);
    for (const w of [weight, goal]) {
      if (w != null && (w < 20 || w > 1000)) {
        setError("Weight looks off. Check the numbers and units.");
        return;
      }
    }

    const changes = {
      unit_system: f.unit,
      gender: f.gender || null,
      goal_weight: goal,
    };
    if (showNames) {
      changes.fname = f.fname.trim();
      changes.lname = f.lname.trim();
    }
    if (f.date_of_birth) changes.date_of_birth = f.date_of_birth;
    if (height != null) changes.height = height;
    // Only log a weigh-in when the weight was actually edited
    if (weight != null && (weightTouched || profile?.weight == null)) changes.weight = weight;
    onSubmit(changes, setError);
  };

  const wu = weightUnit(f.unit);

  return (
    <form className="profile-form" onSubmit={submit} noValidate>
      {error ? (
        <p className="f-alert" role="alert">
          {error}
        </p>
      ) : null}

      {showNames ? (
        <div className="profile-form-row">
          <div className="f-field">
            <label className="f-label" htmlFor="pf-first">
              First name
            </label>
            <input id="pf-first" className="f-input" value={f.fname} onChange={set("fname")} autoComplete="given-name" />
          </div>
          <div className="f-field">
            <label className="f-label" htmlFor="pf-last">
              Last name
            </label>
            <input id="pf-last" className="f-input" value={f.lname} onChange={set("lname")} autoComplete="family-name" />
          </div>
        </div>
      ) : null}

      <div className="profile-form-row">
        <div className="f-field">
          <label className="f-label" htmlFor="pf-dob">
            Birthday
          </label>
          <input id="pf-dob" className="f-input" type="date" value={f.date_of_birth} onChange={set("date_of_birth")} />
          {f.date_of_birth && ageFrom(f.date_of_birth) != null ? (
            <p className="f-hint">Age {ageFrom(f.date_of_birth)}</p>
          ) : null}
        </div>
        <div className="f-field">
          <label className="f-label" htmlFor="pf-gender">
            Gender
          </label>
          <select id="pf-gender" className="f-select" value={f.gender} onChange={set("gender")}>
            <option value="">Not set</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="profile-form-units">
        <legend className="f-label">Units</legend>
        <div className="profile-form-segment" role="radiogroup">
          {[
            ["imperial", "lb, ft/in"],
            ["metric", "kg, cm"],
          ].map(([value, label]) => (
            <label key={value} className="profile-form-seg">
              <input
                type="radio"
                name="units"
                value={value}
                checked={f.unit === value}
                onChange={() => switchUnits(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="profile-form-row profile-form-row--3">
        {f.unit === "imperial" ? (
          <fieldset className="f-field profile-form-height">
            <legend className="f-label">Height</legend>
            <div className="profile-form-inline">
              <input className="f-input" inputMode="numeric" aria-label="Feet" value={f.feet} onChange={set("feet")} />
              <span>ft</span>
              <input className="f-input" inputMode="numeric" aria-label="Inches" value={f.inches} onChange={set("inches")} />
              <span>in</span>
            </div>
          </fieldset>
        ) : (
          <div className="f-field">
            <label className="f-label" htmlFor="pf-cm">
              Height (cm)
            </label>
            <input id="pf-cm" className="f-input" inputMode="decimal" value={f.cm} onChange={set("cm")} />
          </div>
        )}
        <div className="f-field">
          <label className="f-label" htmlFor="pf-weight">
            Current weight ({wu})
          </label>
          <input
            id="pf-weight"
            className="f-input"
            inputMode="decimal"
            value={f.weight}
            onChange={(e) => {
              setWeightTouched(true);
              set("weight")(e);
            }}
          />
        </div>
        <div className="f-field">
          <label className="f-label" htmlFor="pf-goal">
            Goal weight ({wu}, optional)
          </label>
          <input id="pf-goal" className="f-input" inputMode="decimal" value={f.goal} onChange={set("goal")} />
        </div>
      </div>

      <div className="profile-form-actions">
        <button type="submit" className="f-btn f-btn--primary" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {secondary}
      </div>
    </form>
  );
}

export default ProfileForm;
