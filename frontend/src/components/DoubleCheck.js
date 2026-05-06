import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./DoubleCheck.css";
import { buildPlanCreatePayload, savePlan } from "../api/workoutApi";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function DoubleCheck() {
  const navigate = useNavigate();
  const location = useLocation();

  const hasSelectionsPayload =
    location.state != null &&
    Object.prototype.hasOwnProperty.call(location.state, "selectedByDay");

  const [selectedByDay, setSelectedByDay] = useState(() =>
    hasSelectionsPayload ? location.state.selectedByDay : {}
  );

  const [saving, setSaving] = useState(false);

  const flowSource = location.state?.source === "weekly-edit" ? "weekly-edit" : "new-plan";
  const planMeta = location.state?.planMeta || {};

  useEffect(() => {
    if (!hasSelectionsPayload) {
      navigate("/listOfExercises", {
        replace: true,
        state: { source: "new-plan" },
      });
    }
  }, [hasSelectionsPayload, navigate]);

  const orderedDays = useMemo(() => DAYS, []);

  const removeExerciseFromDay = (day, exercise) => {
    setSelectedByDay((prev) => {
      const remaining = (prev[day] || []).filter((name) => name !== exercise);
      return { ...prev, [day]: remaining };
    });
  };

  const commitPlanAndFinish = async () => {
    setSaving(true);
    try {
      const payload = await buildPlanCreatePayload(selectedByDay, planMeta);
      await savePlan(payload);
      navigate("/doneCreating");
    } catch (e) {
      alert(e.message || "Could not save your plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doublecheck">
      <div className="doublecheck-top">
        <p className="doublecheck-copy">
          Perfect! Let&apos;s double check your plan.
          <br />
          Does this look right? (Uncheck to remove an exercise)
        </p>
        <div className="doublecheck-actions">
          <button
            type="button"
            className="doublecheck-btn"
            onClick={() =>
              navigate("/listOfExercises", {
                state: { selectedByDay, source: flowSource },
              })
            }
          >
            GO BACK
          </button>
          <button
            type="button"
            className="doublecheck-btn"
            onClick={commitPlanAndFinish}
            disabled={saving}
          >
            {saving ? "Saving…" : "LOOKS GOOD!"}
          </button>
        </div>
      </div>

      <div className="doublecheck-panel">
        <div className="doublecheck-grid">
          {orderedDays.map((day) => {
            const items = selectedByDay[day] || [];
            return (
              <div key={day}>
                <div className="doublecheck-col-title">{day}</div>
                <div className="doublecheck-card">
                  {items.length === 0 ? (
                    <div className="doublecheck-rest">REST</div>
                  ) : (
                    <div className="doublecheck-list">
                      {items.map((exercise) => (
                        <label key={exercise} className="doublecheck-item">
                          <input
                            type="checkbox"
                            checked
                            onChange={() => removeExerciseFromDay(day, exercise)}
                          />
                          {exercise}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="doublecheck-dots" aria-hidden>
        <span className="doublecheck-dot" />
        <span className="doublecheck-dot" />
        <span className="doublecheck-dot doublecheck-dot--active" />
        <span className="doublecheck-dot" />
      </div>
    </div>
  );
}

export default DoubleCheck;
