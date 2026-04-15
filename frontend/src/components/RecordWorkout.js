import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecordWorkout.css";

const DEFAULT_EXERCISES = [
  { id: "squats", name: "Squats", stars: 4, thumbLabel: "Squats" },
  { id: "bulgarians", name: "Bulgarians", stars: 3, thumbLabel: "Bulgarians" },
  { id: "hip-thrusts", name: "Hip Thrusts", stars: 4, thumbLabel: "Hip Thrusts" },
  { id: "cry", name: "Cry", stars: 2, thumbLabel: "Deadlifts" },
];

function ExerciseCard({ exercise, value, onChange }) {
  const sets = Array.isArray(value?.sets) ? value.sets : [];
  const rating = typeof value?.rating === "number" ? value.rating : exercise.stars || 0;
  const [hoverRating, setHoverRating] = useState(0);
  const [draftSet, setDraftSet] = useState("");
  const [draftReps, setDraftReps] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const poundsToKg = (value) => value * 0.45359237;
  const kgToPounds = (value) => value / 0.45359237;
  const toFixed1 = (value) => Math.round(value * 10) / 10;
  const displayWeight = (weightLbs) =>
    weightUnit === "lbs" ? toFixed1(weightLbs) : toFixed1(poundsToKg(weightLbs));

  const addSet = () => {
    const r = draftReps === "" ? null : Number(draftReps);
    const w = draftWeight === "" ? null : Number(draftWeight);
    if (r == null || Number.isNaN(r) || w == null || Number.isNaN(w)) {
      return;
    }
    const s = draftSet === "" ? sets.length + 1 : Number(draftSet);
    const nextSetNum = Number.isFinite(s) && s > 0 ? s : sets.length + 1;
    const nextSet = {
      id: `${exercise.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      set: nextSetNum,
      reps: r,
      weightLbs: weightUnit === "lbs" ? w : kgToPounds(w),
    };
    onChange({
      sets: [...sets, nextSet],
      rating,
    });
  };

  const removeSetAt = (index) => {
    onChange({
      sets: sets.filter((_, i) => i !== index),
      rating,
    });
  };

  const toggleWeightUnit = () => {
    const nextUnit = weightUnit === "lbs" ? "kg" : "lbs";
    setDraftWeight((prev) => {
      if (prev === "") return prev;
      const numeric = Number(prev);
      if (Number.isNaN(numeric)) return "";
      const converted = nextUnit === "kg" ? poundsToKg(numeric) : kgToPounds(numeric);
      return String(toFixed1(converted));
    });
    setWeightUnit(nextUnit);
  };

  return (
    <article className="record-workout-card">
      <h2 className="record-workout-card-name">{exercise.name}</h2>
      <div className="record-workout-card-body">
        <div className="record-workout-card-left">
          <div
            className="record-workout-stars"
            aria-label={`${rating} of 5 stars`}
            onMouseLeave={() => setHoverRating(0)}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const starValue = i + 1;
              const isActive = starValue <= (hoverRating || rating);
              return (
                <button
                  key={starValue}
                  type="button"
                  className="record-workout-star-btn"
                  onClick={() =>
                    onChange({
                      sets,
                      rating: starValue,
                    })
                  }
                  onMouseEnter={() => setHoverRating(starValue)}
                  aria-label={`Rate ${exercise.name} ${starValue} out of 5`}
                >
                  {isActive ? "★" : "☆"}
                </button>
              );
            })}
            <span className="record-workout-stars-tooltip" role="tooltip">
              Rate this workout so you can remember how you felt today while doing {exercise.name}.
            </span>
          </div>
          <div className="record-workout-thumb">{exercise.thumbLabel}</div>
        </div>
        <div className="record-workout-card-main">
          <div className="record-workout-logged-wrap">
            {sets.length === 0 ? (
              <div className="record-workout-logged-row">
                <span className="record-workout-current-set-text">—</span>
              </div>
            ) : (
              sets.map((row, index) => (
                <div key={row.id} className="record-workout-logged-row">
                  <span className="record-workout-current-set-text">
                    {row.set} × {row.reps} @ {displayWeight(row.weightLbs)} {weightUnit}
                  </span>
                  <button
                    type="button"
                    className="record-workout-icon-btn record-workout-icon-btn--minus"
                    onClick={() => removeSetAt(index)}
                    aria-label={`Remove set ${row.set}`}
                  >
                    −
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="record-workout-input-row-wrap">
            <div className="record-workout-input-row">
              <input
                className="record-workout-input"
                type="number"
                min="1"
                placeholder="set"
                value={draftSet}
                onChange={(e) => setDraftSet(e.target.value)}
                aria-label="Set number"
              />
              <span>×</span>
              <input
                className="record-workout-input"
                type="number"
                min="0"
                placeholder="reps"
                value={draftReps}
                onChange={(e) => setDraftReps(e.target.value)}
                aria-label="Reps"
              />
              <span>@</span>
              <input
                className="record-workout-input"
                type="number"
                min="0"
                step="0.5"
                placeholder={`weight (${weightUnit})`}
                value={draftWeight}
                onChange={(e) => setDraftWeight(e.target.value)}
                aria-label={`Weight in ${weightUnit}`}
              />
              <span className="record-workout-unit-label">{weightUnit}</span>
            </div>
            <button
              type="button"
              className="record-workout-icon-btn record-workout-icon-btn--plus"
              onClick={addSet}
              aria-label="Add set"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="record-workout-unit-toggle"
        onClick={toggleWeightUnit}
      >
        {weightUnit === "lbs" ? "Use kg" : "Use lbs"}
      </button>
    </article>
  );
}

function RecordWorkout() {
  const navigate = useNavigate();

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const selectedDay = useMemo(() => {
    const stored = localStorage.getItem("fittmm_selected_day");
    return stored || new Date().toLocaleDateString("en-US", { weekday: "long" });
  }, []);

  const exercises = useMemo(() => {
    try {
      const raw = localStorage.getItem("fittmm_plan_day_selections");
      const parsed = raw ? JSON.parse(raw) : {};
      const names = Array.isArray(parsed[selectedDay]) ? parsed[selectedDay] : [];
      if (names.length === 0) return DEFAULT_EXERCISES;
      return names.map((name, i) => ({
        id: `${name}-${i}`,
        name,
        stars: 3,
        thumbLabel: name,
      }));
    } catch {
      return DEFAULT_EXERCISES;
    }
  }, [selectedDay]);

  const [exerciseEntries, setExerciseEntries] = useState(() => {
    let savedByName = {};
    try {
      const dayLogsRaw = localStorage.getItem("fittmm_workout_day_logs");
      const dayLogs = dayLogsRaw ? JSON.parse(dayLogsRaw) : {};
      const savedExercises = Array.isArray(dayLogs?.[selectedDay]?.exercises)
        ? dayLogs[selectedDay].exercises
        : [];
      savedByName = savedExercises.reduce((acc, exercise) => {
        acc[exercise.name] = exercise;
        return acc;
      }, {});
    } catch {
      savedByName = {};
    }

    const entries = {};
    exercises.forEach((exercise) => {
      const saved = savedByName[exercise.name];
      const savedSets = Array.isArray(saved?.sets)
        ? saved.sets.map((row, idx) => ({
            id: `${exercise.id}-saved-${idx}`,
            set: Number(row.set) || idx + 1,
            reps: Number(row.reps) || 0,
            weightLbs: Number(row.weightLbs ?? row.weight) || 0,
          }))
        : [];

      entries[exercise.id] = {
        sets: savedSets,
        rating: typeof saved?.rating === "number" ? saved.rating : exercise.stars || 0,
      };
    });
    return entries;
  });

  const updateExerciseEntry = (exerciseId, nextValue) => {
    setExerciseEntries((prev) => ({
      ...prev,
      [exerciseId]: nextValue,
    }));
  };

  const saveWorkout = () => {
    const dateIso = new Date().toISOString();
    const dayRecord = {
      day: selectedDay,
      date: dateIso,
      exercises: exercises.map((exercise) => {
        const current = exerciseEntries[exercise.id] || { sets: [], rating: exercise.stars || 0 };
        const savedSets = (current.sets || []).map((row) => ({
          set: row.set,
          reps: row.reps,
          weight: row.weightLbs,
          weightLbs: row.weightLbs,
        }));
        return {
          name: exercise.name,
          rating: current.rating,
          sets: savedSets,
          totalVolume: savedSets.reduce((sum, row) => sum + row.reps * row.weightLbs, 0),
        };
      }),
    };

    dayRecord.totalVolume = dayRecord.exercises.reduce(
      (sum, exercise) => sum + (exercise.totalVolume || 0),
      0
    );

    try {
      const logsRaw = localStorage.getItem("fittmm_workout_logs");
      const existingLogs = logsRaw ? JSON.parse(logsRaw) : [];
      const nonMatchingLogs = Array.isArray(existingLogs)
        ? existingLogs.filter((entry) => entry?.day !== selectedDay)
        : [];
      localStorage.setItem(
        "fittmm_workout_logs",
        JSON.stringify([...nonMatchingLogs, dayRecord])
      );

      const dayLogsRaw = localStorage.getItem("fittmm_workout_day_logs");
      const dayLogs = dayLogsRaw ? JSON.parse(dayLogsRaw) : {};
      dayLogs[selectedDay] = dayRecord;
      localStorage.setItem("fittmm_workout_day_logs", JSON.stringify(dayLogs));
    } catch {
      // no-op for localStorage parse/set failure
    }

    navigate("/homepage");
  };

  return (
    <div className="record-workout">
      <nav className="record-workout-nav" aria-label="Workout page navigation">
        <div aria-hidden="true" />
        <h1 className="record-workout-nav-title">Record Today&apos;s Workout</h1>
        <div className="record-workout-nav-actions">
          <div className="record-workout-avatar" aria-hidden />
          <button
            type="button"
            className="record-workout-nav-link"
            onClick={() => navigate("/homepage")}
          >
            Home
          </button>
          <button type="button" className="record-workout-nav-link">
            settings
          </button>
          <button
            type="button"
            className="record-workout-nav-link"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/");
            }}
          >
            logout
          </button>
        </div>
      </nav>

      <p className="record-workout-date-line">Exercises for {dateLabel}</p>

      <div className="record-workout-container">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            value={exerciseEntries[ex.id]}
            onChange={(next) => updateExerciseEntry(ex.id, next)}
          />
        ))}
      </div>

      <div className="record-workout-done-wrap">
        <button type="button" className="record-workout-done" onClick={saveWorkout}>
          Done!
        </button>
      </div>
    </div>
  );
}

export default RecordWorkout;
