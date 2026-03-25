import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./TodaysBreakdown.css";

// TODO: replace with API call to check if user has a workout plan
function TodaysBreakdown({ isDark = false }) {
  const navigate = useNavigate();
  const [hasWorkoutPlan, setHasWorkoutPlan] = useState(null);

  useEffect(() => {
    // TODO: fetch from backend e.g. GET /api/users/me/workout-plan
    // For now, assume no plan
    setHasWorkoutPlan(false);
  }, []);

  const handleYes = () => {
    navigate("/plan/new");
  };

  const handleNoJkYes = () => {
    handleYes();
  };

  if (hasWorkoutPlan === null) {
    return (
      <div className="todays-breakdown">
        <h2 className="todays-breakdown-title">Today's breakdown</h2>
        <div className="todays-breakdown-body">
          <p className="todays-breakdown-loading">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasWorkoutPlan) {
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

  return (
    <div className="todays-breakdown">
      <h2 className="todays-breakdown-title">Today's breakdown</h2>
      <div className="todays-breakdown-body">
        <p className="todays-breakdown-content">Your workout for today will go here.</p>
      </div>
    </div>
  );
}

export default TodaysBreakdown;
