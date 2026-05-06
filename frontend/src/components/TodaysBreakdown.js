import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./TodaysBreakdown.css";
import { setScopedItem, K } from "../utils/fittmmStorage";
import { latestPayloadForWeekday } from "../api/workoutApi";

function TodaysBreakdown({
  selectedDay,
  planSelections = {},
  sessions = [],
  planLoading = false,
  sessionsLoading = false,
}) {
  const navigate = useNavigate();
  const [hasWorkoutPlan, setHasWorkoutPlan] = useState(null);
  const [todayExercises, setTodayExercises] = useState([]);
  const [loggedByExercise, setLoggedByExercise] = useState({});
  const [isRestDay, setIsRestDay] = useState(false);
  const [displayDate, setDisplayDate] = useState(new Date());

  const loading = planLoading || sessionsLoading;

  useEffect(() => {
    try {
      const today = new Date();
      const currentDayName = today.toLocaleDateString("en-US", { weekday: "long" });
      const dayName = selectedDay || currentDayName;
      const parsed = planSelections || {};
      const hasAnySelections = Object.values(parsed).some(
        (items) => Array.isArray(items) && items.length > 0
      );
      const selectedExercises = Array.isArray(parsed[dayName]) ? parsed[dayName] : [];
      const selectedIsRestDay = hasAnySelections && selectedExercises.length === 0;
      setIsRestDay(selectedIsRestDay);
      setHasWorkoutPlan(hasAnySelections && selectedExercises.length > 0);
      setTodayExercises(selectedExercises);

      const dayLog = latestPayloadForWeekday(sessions, dayName);
      const byExercise = {};
      if (dayLog && Array.isArray(dayLog.exercises)) {
        dayLog.exercises.forEach((exercise) => {
          byExercise[exercise.name] = Array.isArray(exercise.sets) ? exercise.sets : [];
        });
      }
      setLoggedByExercise(byExercise);

      const dayOrder = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const selectedIndex = dayOrder.indexOf(dayName);
      const currentIndex = dayOrder.indexOf(currentDayName);
      if (selectedIndex >= 0 && currentIndex >= 0) {
        const shown = new Date(today);
        shown.setDate(today.getDate() + (selectedIndex - currentIndex));
        setDisplayDate(shown);
      } else {
        setDisplayDate(today);
      }
    } catch {
      setHasWorkoutPlan(false);
      setTodayExercises([]);
      setLoggedByExercise({});
      setIsRestDay(false);
      setDisplayDate(new Date());
    }
  }, [selectedDay, planSelections, sessions]);

  const handleYes = () => {
    navigate("/plan/new");
  };

  const handleNoJkYes = () => {
    handleYes();
  };

  const handleEdit = () => {
    if (selectedDay) {
      setScopedItem(K.SELECTED_DAY, selectedDay);
    }
    navigate("/recordWorkout");
  };

  const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);
  const getDefaultSets = (exerciseName) =>
    loggedByExercise[exerciseName]?.length
      ? loggedByExercise[exerciseName]
      : [{ set: null, reps: null, weight: null }];

  if (loading || hasWorkoutPlan === null) {
    return (
      <div className="todays-breakdown">
        <h2 className="todays-breakdown-title">Today's breakdown</h2>
        <div className="todays-breakdown-body">
          <p className="todays-breakdown-loading">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasWorkoutPlan && !isRestDay) {
    return (
      <div className="todays-breakdown">
        <h2 className="todays-breakdown-title">Today's breakdown</h2>
        <div className="todays-breakdown-body">
          <p className="todays-breakdown-empty">
            *crickets* Uh oh :( it doesn't look like you have a workout plan!
            <br />
            Would you like to create one?
          </p>
          <div className="todays-breakdown-actions">
            <button
              type="button"
              className="todays-breakdown-btn todays-breakdown-btn-primary"
              onClick={handleYes}
            >
              Yes!
            </button>
            <button
              type="button"
              className="todays-breakdown-btn todays-breakdown-btn-secondary"
              onClick={handleNoJkYes}
            >
              No...jk yes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isRestDay) {
    return (
      <div className="todays-breakdown">
        <h2 className="todays-breakdown-title">Today's breakdown</h2>
        <div className="todays-breakdown-body todays-breakdown-body--center">
          <p className="todays-breakdown-content">It&apos;s your rest day! Take a break!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="todays-breakdown">
      <div className="todays-breakdown-body">
        <section className="workout-preview-card">
          <header className="workout-preview-header">
            <h2 className="workout-preview-title">Today&apos;s Breakdown</h2>
            <span className="workout-preview-date">
              {displayDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </header>

          <div className="workout-preview-table-head">
            <span>Exercise</span>
            <span>S / R / W</span>
            <span>Volume</span>
          </div>

          <div className="workout-preview-table-body">
            {todayExercises.map((exercise, idx) => {
              const setRows = getDefaultSets(exercise);
              const hasAnyLogged = setRows.some(
                (row) => row.reps != null && row.weight != null
              );
              const volumes = setRows.map((row) =>
                row.reps != null && (row.weight != null || row.weightLbs != null)
                  ? row.reps * (row.weight ?? row.weightLbs)
                  : null
              );
              const totalVolume = volumes.reduce(
                (sum, value) => sum + (typeof value === "number" ? value : 0),
                0
              );

              return (
                <article
                  key={`${exercise}-${idx}`}
                  className={`workout-preview-exercise ${
                    idx < todayExercises.length - 1 ? "workout-preview-exercise--with-divider" : ""
                  }`}
                >
                  <div className="workout-preview-exercise-col">
                    <p className="workout-preview-exercise-name">{exercise}</p>
                    <div className="workout-preview-thumb">{exercise}</div>
                  </div>

                  <div className="workout-preview-srw-col">
                    {setRows.map((row, rowIdx) => (
                      <p key={`${exercise}-srw-${rowIdx}`} className="workout-preview-row-line">
                        {row.set ?? "?"} x {row.reps ?? "?"} @ {row.weight ?? row.weightLbs ?? "?"}
                      </p>
                    ))}
                  </div>

                  <div className="workout-preview-volume-col">
                    {volumes.map((volume, rowIdx) => (
                      <p key={`${exercise}-vol-${rowIdx}`} className="workout-preview-row-line">
                        {typeof volume === "number" ? formatNumber(volume) : "?"}
                      </p>
                    ))}
                    <p className="workout-preview-total">
                      {hasAnyLogged ? `${formatNumber(totalVolume)} total` : "? total"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="workout-preview-footer">
            <button
              type="button"
              className="todays-breakdown-btn todays-breakdown-btn-primary workout-preview-edit"
              onClick={handleEdit}
            >
              Edit
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default TodaysBreakdown;
