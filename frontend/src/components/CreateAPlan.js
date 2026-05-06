import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAPlan.css";

const TOTAL_STEPS = 4;

const WEEKDAYS = [
  { id: "sun", label: "Sunday" },
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
];

const STEP_INTRO = [
  null,
  {
    title: "Name your plan",
    body:
      "Give this training block a clear name and optional details so you can find it later.",
  },
  {
    title: "Add your lifts",
    body:
      "List the exercises in this plan. Sets, reps, and weight are optional for now.",
  },
  {
    title: "Review and save",
    body: "Make sure everything looks right, then save your plan.",
  },
];

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

function CreateAPlan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [planName, setPlanName] = useState("");
  const [focus, setFocus] = useState("");
  const [weeks, setWeeks] = useState("");
  const [notes, setNotes] = useState("");
  const [workoutDays, setWorkoutDays] = useState(() =>
    WEEKDAYS.reduce((acc, d) => ({ ...acc, [d.id]: false }), {})
  );
  const [exercises, setExercises] = useState(() => [newExerciseRow()]);

  const toggleDay = (id) => {
    setWorkoutDays((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedDayIds = WEEKDAYS.filter((d) => workoutDays[d.id]).map((d) => d.id);
  const selectedDayLabels = WEEKDAYS.filter((d) => workoutDays[d.id]).map(
    (d) => d.label
  );

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

  const canGoNextFromStep0 = selectedDayIds.length > 0;
  const canGoNextFromStep1 = planName.trim().length > 0;

  const goNext = () => {
    if (step === 0 && !canGoNextFromStep0) return;
    if (step === 0) {
      navigate("/listOfExercises", {
        state: {
          source: "new-plan",
          planMeta: {
            planName: planName.trim() || "My plan",
            focus: focus.trim(),
            notes: notes.trim(),
            weeks,
          },
        },
      });
      return;
    }
    if (step === 1 && !canGoNextFromStep1) return;
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigate("/homepage");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!planName.trim()) return;
    navigate("/homepage");
  };

  const intro = STEP_INTRO[step];
  const isFirstStep = step === 0;
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="create-a-plan">
      <header className="create-a-plan-header">
        <button
          type="button"
          className="create-a-plan-exit"
          onClick={() => navigate("/homepage")}
        >
          Exit
        </button>
      </header>

      <main className="create-a-plan-main">
        <div className="create-a-plan-card">
          <form className="create-a-plan-form" onSubmit={handleSubmit}>
            {step === 0 && (
              <div className="create-a-plan-step0">
                <p className="create-a-plan-lede">
                  Our app&apos;s purpose is to help you keep track of your progress by
                  calculating your <em>volume</em> after each workout. You can check
                  your volume by clicking <strong>PROGRESS</strong> on your main page.
                </p>
                <p className="create-a-plan-lede">
                  In order for your progress to be tracked more accurately, we recommend
                  making and sticking to the same workout plan for at least two months,
                  but don&apos;t worry, you can always make a new plan if you&apos;re
                  bored!
                </p>
                <h2 className="create-a-plan-headline">Let&apos;s create a plan!</h2>
                <p className="create-a-plan-sub">
                  Check the days you want to work out! (Unmarked days will be counted as
                  Rest day)
                </p>
                <fieldset className="create-a-plan-fieldset create-a-plan-fieldset--days">
                  <legend className="visually-hidden">Workout days</legend>
                  <div
                    className="create-a-plan-checkboxes create-a-plan-checkboxes--stacked"
                    role="group"
                    aria-label="Days of the week"
                  >
                    {WEEKDAYS.map((d) => (
                      <label key={d.id} className="create-a-plan-check-label">
                        <input
                          type="checkbox"
                          className="create-a-plan-check"
                          checked={workoutDays[d.id]}
                          onChange={() => toggleDay(d.id)}
                        />
                        <span>{d.label}</span>
                      </label>
                    ))}
                  </div>
                  {!canGoNextFromStep0 && (
                    <p className="create-a-plan-validation" role="status">
                      Select at least one workout day to continue.
                    </p>
                  )}
                </fieldset>
              </div>
            )}

            {step > 0 && intro && (
              <section className="create-a-plan-intro" aria-live="polite">
                <h2 className="create-a-plan-intro-title">{intro.title}</h2>
                <p className="create-a-plan-intro-body">{intro.body}</p>
              </section>
            )}

            {step === 1 && (
              <section className="create-a-plan-fields" aria-labelledby="details-heading">
                <span id="details-heading" className="visually-hidden">
                  Plan details
                </span>
                <label className="create-a-plan-label">
                  Plan name
                  <input
                    className="create-a-plan-input"
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. 4-week strength block"
                  />
                </label>
                <label className="create-a-plan-label">
                  Focus / goal
                  <input
                    className="create-a-plan-input"
                    type="text"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="e.g. Hypertrophy, consistency"
                  />
                </label>
                <label className="create-a-plan-label">
                  Duration (weeks)
                  <input
                    className="create-a-plan-input create-a-plan-input--short"
                    type="number"
                    min="1"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="create-a-plan-label">
                  Notes
                  <textarea
                    className="create-a-plan-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Schedule, progression, or reminders"
                    rows={3}
                  />
                </label>
                {!canGoNextFromStep1 && (
                  <p className="create-a-plan-validation" role="status">
                    Enter a plan name to continue.
                  </p>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="create-a-plan-fields">
                <div className="create-a-plan-exercises">
                  <div className="create-a-plan-exercises-head">
                    <h3 className="create-a-plan-section-title">Exercises</h3>
                    <button
                      type="button"
                      className="create-a-plan-btn-secondary"
                      onClick={addExercise}
                    >
                      Add exercise
                    </button>
                  </div>
                  <ul className="create-a-plan-exercise-list">
                    {exercises.map((row, index) => (
                      <li key={row.id} className="create-a-plan-exercise-row">
                        <span className="create-a-plan-exercise-index">{index + 1}</span>
                        <input
                          className="create-a-plan-input create-a-plan-input--grow"
                          type="text"
                          aria-label={`Exercise ${index + 1} name`}
                          placeholder="Exercise name"
                          value={row.name}
                          onChange={(e) =>
                            updateExercise(row.id, "name", e.target.value)
                          }
                        />
                        <input
                          className="create-a-plan-input create-a-plan-input--narrow"
                          type="number"
                          min="0"
                          aria-label={`Exercise ${index + 1} sets`}
                          placeholder="Sets"
                          value={row.sets}
                          onChange={(e) =>
                            updateExercise(row.id, "sets", e.target.value)
                          }
                        />
                        <input
                          className="create-a-plan-input create-a-plan-input--narrow"
                          type="number"
                          min="0"
                          aria-label={`Exercise ${index + 1} reps`}
                          placeholder="Reps"
                          value={row.reps}
                          onChange={(e) =>
                            updateExercise(row.id, "reps", e.target.value)
                          }
                        />
                        <input
                          className="create-a-plan-input create-a-plan-input--narrow"
                          type="number"
                          min="0"
                          step="0.5"
                          aria-label={`Exercise ${index + 1} weight`}
                          placeholder="lb/kg"
                          value={row.weight}
                          onChange={(e) =>
                            updateExercise(row.id, "weight", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="create-a-plan-remove"
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
              </section>
            )}

            {step === 3 && (
              <section className="create-a-plan-review" aria-labelledby="review-heading">
                <h3 id="review-heading" className="create-a-plan-section-title">
                  Summary
                </h3>
                <dl className="create-a-plan-dl">
                  <dt>Plan name</dt>
                  <dd>{planName.trim() || "—"}</dd>
                  <dt>Workout days</dt>
                  <dd>
                    {selectedDayLabels.length
                      ? selectedDayLabels.join(", ")
                      : "—"}
                  </dd>
                  {focus.trim() && (
                    <>
                      <dt>Focus</dt>
                      <dd>{focus.trim()}</dd>
                    </>
                  )}
                  {weeks !== "" && (
                    <>
                      <dt>Duration</dt>
                      <dd>{weeks} week(s)</dd>
                    </>
                  )}
                  <dt>Exercises</dt>
                  <dd>{exercises.filter((e) => e.name.trim()).length} listed</dd>
                </dl>
              </section>
            )}

            <div
              className={`create-a-plan-nav ${isFirstStep ? "create-a-plan-nav--solo" : ""}`}
              aria-label="Step navigation"
            >
              {!isFirstStep && (
                <button
                  type="button"
                  className="create-a-plan-nav-back"
                  onClick={goBack}
                >
                  Back
                </button>
              )}
              {!isLastStep ? (
                <button
                  type="button"
                  className="create-a-plan-continue"
                  onClick={goNext}
                  disabled={
                    (step === 0 && !canGoNextFromStep0) ||
                    (step === 1 && !canGoNextFromStep1)
                  }
                >
                  Continue
                </button>
              ) : (
                <button type="submit" className="create-a-plan-continue">
                  Save plan
                </button>
              )}
            </div>

            <div
              className="create-a-plan-pagination"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step + 1}
              aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}
            >
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < step
                      ? "create-a-plan-page-dot create-a-plan-page-dot--done"
                      : i === step
                        ? "create-a-plan-page-dot create-a-plan-page-dot--current"
                        : "create-a-plan-page-dot"
                  }
                />
              ))}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CreateAPlan;
