import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DoubleCheck.css";

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
  const [selectedByDay, setSelectedByDay] = useState(() => {
    try {
      const raw = localStorage.getItem("fittmm_plan_day_selections");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const orderedDays = useMemo(() => DAYS, []);

  const removeExerciseFromDay = (day, exercise) => {
    setSelectedByDay((prev) => {
      const remaining = (prev[day] || []).filter((name) => name !== exercise);
      const next = { ...prev, [day]: remaining };
      localStorage.setItem("fittmm_plan_day_selections", JSON.stringify(next));
      return next;
    });
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
            onClick={() => navigate("/listOfExercises")}
          >
            GO BACK
          </button>
          <button
            type="button"
            className="doublecheck-btn"
            onClick={() => navigate("/doneCreating")}
          >
            LOOKS GOOD!
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
