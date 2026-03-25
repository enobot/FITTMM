import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateWorkout.css";

function newExerciseRow() {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "",
    sets: "",
    reps: "",
    weight: "",
  };
}

function CreateWorkout() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState(() => [newExerciseRow()]);

  const addExercise = () => {
    setExercises((rows) => [...rows, newExerciseRow()]);
  };

  const removeExercise = (id) => {
    setExercises((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const updateExercise = (id, field, value) => {
    setExercises((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    const workout = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: title.trim(),
      notes: notes.trim(),
      exercises: exercises.map((r) => ({
        name: r.name.trim(),
        sets: r.sets === "" ? null : Number(r.sets),
        reps: r.reps === "" ? null : Number(r.reps),
        weight: r.weight === "" ? null : Number(r.weight),
      })),
      createdAt: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem("fittmm_workouts");
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(workout);
      localStorage.setItem("fittmm_workouts", JSON.stringify(list));
    } catch {
      /* ignore storage errors */
    }

    navigate("/homepage");
  };

  return (
    <div className="create-workout">
      <header className="create-workout-header">
        <button
          type="button"
          className="create-workout-back"
          onClick={() => navigate("/homepage")}
        >
          ← Back
        </button>
        <h1 className="create-workout-title">New workout</h1>
      </header>

      <main className="create-workout-main">
        <form className="create-workout-form" onSubmit={handleSubmit}>
          <label className="create-workout-label">
            Workout name
            <input
              className="create-workout-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Push day"
              required
            />
          </label>

          <label className="create-workout-label">
            Notes
            <textarea
              className="create-workout-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional warmup, goals, or reminders"
              rows={3}
            />
          </label>

          <div className="create-workout-exercises">
            <div className="create-workout-exercises-head">
              <h2 className="create-workout-section-title">Exercises</h2>
              <button
                type="button"
                className="create-workout-btn-secondary"
                onClick={addExercise}
              >
                Add exercise
              </button>
            </div>

            <ul className="create-workout-exercise-list">
              {exercises.map((row, index) => (
                <li key={row.id} className="create-workout-exercise-row">
                  <span className="create-workout-exercise-index">{index + 1}</span>
                  <input
                    className="create-workout-input create-workout-input--grow"
                    type="text"
                    aria-label={`Exercise ${index + 1} name`}
                    placeholder="Exercise name"
                    value={row.name}
                    onChange={(e) => updateExercise(row.id, "name", e.target.value)}
                  />
                  <input
                    className="create-workout-input create-workout-input--narrow"
                    type="number"
                    min="0"
                    aria-label={`Exercise ${index + 1} sets`}
                    placeholder="Sets"
                    value={row.sets}
                    onChange={(e) => updateExercise(row.id, "sets", e.target.value)}
                  />
                  <input
                    className="create-workout-input create-workout-input--narrow"
                    type="number"
                    min="0"
                    aria-label={`Exercise ${index + 1} reps`}
                    placeholder="Reps"
                    value={row.reps}
                    onChange={(e) => updateExercise(row.id, "reps", e.target.value)}
                  />
                  <input
                    className="create-workout-input create-workout-input--narrow"
                    type="number"
                    min="0"
                    step="0.5"
                    aria-label={`Exercise ${index + 1} weight`}
                    placeholder="lb/kg"
                    value={row.weight}
                    onChange={(e) => updateExercise(row.id, "weight", e.target.value)}
                  />
                  <button
                    type="button"
                    className="create-workout-remove"
                    onClick={() => removeExercise(row.id)}
                    disabled={exercises.length <= 1}
                    aria-label={`Remove exercise ${index + 1}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="create-workout-actions">
            <button type="submit" className="create-workout-submit">
              Save workout
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CreateWorkout;
