import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ListOfExercises.css";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EXERCISES = [
  { name: "Squats", group: "legs", emoji: "🏋" },
  { name: "Deadlifts", group: "back", emoji: "🏋" },
  { name: "Romanian Deadlift", group: "legs", emoji: "🏋" },
  { name: "Hip Thrusts", group: "glutes", emoji: "🏋" },
  { name: "Leg Extensions", group: "legs", emoji: "🦵" },
  { name: "Goblet Squat", group: "legs", emoji: "🏋" },
  { name: "Front Squat", group: "legs", emoji: "🏋" },
  { name: "Split Squats", group: "legs", emoji: "🏋" },
  { name: "Glute Bridges", group: "glutes", emoji: "🏋" },
  { name: "Box Squat", group: "legs", emoji: "🏋" },
];

function ListOfExercises() {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState("Tuesday");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedByDay, setSelectedByDay] = useState(() => {
    try {
      const raw = localStorage.getItem("fittmm_plan_day_selections");
      return raw
        ? JSON.parse(raw)
        : {
            Tuesday: ["Split Squats", "Hip Thrusts"],
          };
    } catch {
      return { Tuesday: ["Split Squats", "Hip Thrusts"] };
    }
  });

  const items = useMemo(() => {
    return EXERCISES.filter((e) => {
      const queryMatch = e.name.toLowerCase().includes(query.toLowerCase());
      const filterMatch = filter === "all" || e.group === filter;
      return queryMatch && filterMatch;
    });
  }, [query, filter]);

  const selectedForDay = new Set(selectedByDay[selectedDay] || []);

  const toggleExercise = (name) => {
    setSelectedByDay((prev) => {
      const current = new Set(prev[selectedDay] || []);
      if (current.has(name)) current.delete(name);
      else current.add(name);
      return { ...prev, [selectedDay]: Array.from(current) };
    });
  };

  return (
    <div className="list-exercises">
      <div className="list-exercises-top">
        <button
          type="button"
          className="list-exercises-back"
          onClick={() => navigate("/plan/new")}
        >
          GO BACK
        </button>
        <h2>Choose your exercises for each day!</h2>
        <select
          className="list-exercises-day"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          {DAYS.map((day) => (
            <option key={day}>{day}</option>
          ))}
        </select>
        <button
          type="button"
          className="list-exercises-continue"
          onClick={() => {
            localStorage.setItem(
              "fittmm_plan_day_selections",
              JSON.stringify(selectedByDay)
            );
            navigate("/doublecheck");
          }}
        >
          CONTINUE
        </button>
      </div>

      <h1 style={{ textAlign: "center", margin: "0 0 10px" }}>List of Exercises</h1>
      <div className="list-exercises-panel">
        <div className="list-exercises-head">
          <a href="#0" className="list-exercises-link">
            Don&apos;t see an exercise? Add your own
          </a>
          <input
            className="list-exercises-search"
            placeholder="Search for an exercise....."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="list-exercises-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">filter</option>
            <option value="legs">legs</option>
            <option value="glutes">glutes</option>
            <option value="back">back</option>
          </select>
        </div>

        <div className="list-exercises-grid">
          {items.map((exercise) => (
            <button
              key={exercise.name}
              type="button"
              className={`list-exercises-card ${
                selectedForDay.has(exercise.name)
                  ? "list-exercises-card--selected"
                  : ""
              }`}
              onClick={() => toggleExercise(exercise.name)}
            >
              <div className="list-exercises-img">{exercise.emoji}</div>
              <div className="list-exercises-name">{exercise.name}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="list-exercises-dots" aria-hidden>
        <span className="list-exercises-dot" />
        <span className="list-exercises-dot list-exercises-dot--active" />
        <span className="list-exercises-dot" />
        <span className="list-exercises-dot" />
      </div>
    </div>
  );
}

export default ListOfExercises;
