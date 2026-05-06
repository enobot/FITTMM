import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ListOfExercises.css";
import {
  fetchPlan,
  selectionsFromApiPlan,
  fetchExerciseCatalog,
  createCustomExercise,
} from "../api/workoutApi";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PRESET_EXERCISES = [
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

const BODY_PART_OPTIONS = [
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "abs", label: "Abs" },
  { value: "bicep", label: "Bicep" },
  { value: "back", label: "Back" },
];

const BODY_PART_CUSTOM = "__custom__";

function filterLabel(slug) {
  if (!slug || slug === "all") return slug;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

const PRESET_NAMES_LOWER = new Set(
  PRESET_EXERCISES.map((e) => e.name.trim().toLowerCase())
);

function flowSourceFromLocation(location) {
  return location.state?.source === "weekly-edit" ? "weekly-edit" : "new-plan";
}

function ListOfExercises() {
  const navigate = useNavigate();
  const location = useLocation();
  const flowSource = flowSourceFromLocation(location);

  const [selectedDay, setSelectedDay] = useState("Tuesday");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const [selectedByDay, setSelectedByDay] = useState(() =>
    location.state?.selectedByDay !== undefined ? location.state.selectedByDay : {}
  );

  const [apiExercises, setApiExercises] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [bodyPartSelect, setBodyPartSelect] = useState("legs");
  const [bodyPartCustomText, setBodyPartCustomText] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const reloadApiExercises = useCallback(async () => {
    try {
      const list = await fetchExerciseCatalog();
      setApiExercises(Array.isArray(list) ? list : []);
    } catch {
      setApiExercises([]);
    }
  }, []);

  useEffect(() => {
    reloadApiExercises();
  }, [reloadApiExercises]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (location.state?.selectedByDay !== undefined) return;
      if (location.state?.source !== "weekly-edit") return;
      try {
        const plan = await fetchPlan();
        if (cancelled) return;
        setSelectedByDay(plan ? selectionsFromApiPlan(plan) : {});
      } catch {
        if (!cancelled) setSelectedByDay({});
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [location.state?.source, location.state?.selectedByDay]);

  useEffect(() => {
    if (!addModalOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setAddModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addModalOpen]);

  const userAddedRows = useMemo(() => {
    return apiExercises
      .filter(
        (ex) =>
          ex.userid != null &&
          !PRESET_NAMES_LOWER.has(String(ex.name || "").trim().toLowerCase())
      )
      .map((ex) => ({
        key: `user-${ex.id}`,
        name: ex.name,
        group: ex.body_part || "back",
        emoji: "✦",
      }));
  }, [apiExercises]);

  const catalog = useMemo(
    () => [...PRESET_EXERCISES, ...userAddedRows],
    [userAddedRows]
  );

  const catalogFilterGroups = useMemo(() => {
    const set = new Set(
      catalog.map((e) => String(e.group || "back").toLowerCase())
    );
    const presetOrder = ["legs", "glutes", "abs", "bicep", "back"];
    const ordered = presetOrder.filter((g) => set.has(g));
    const rest = [...set].filter((g) => !presetOrder.includes(g)).sort();
    return [...ordered, ...rest];
  }, [catalog]);

  const items = useMemo(() => {
    return catalog.filter((e) => {
      const queryMatch = e.name.toLowerCase().includes(query.toLowerCase());
      const g = String(e.group || "back").toLowerCase();
      const filterMatch = filter === "all" || g === filter;
      return queryMatch && filterMatch;
    });
  }, [catalog, query, filter]);

  const selectedForDay = new Set(selectedByDay[selectedDay] || []);

  const toggleExercise = (name) => {
    setSelectedByDay((prev) => {
      const current = new Set(prev[selectedDay] || []);
      if (current.has(name)) current.delete(name);
      else current.add(name);
      return { ...prev, [selectedDay]: Array.from(current) };
    });
  };

  const planMeta = location.state?.planMeta || {};

  const openAddModal = () => {
    setCustomName("");
    setBodyPartSelect("legs");
    setBodyPartCustomText("");
    setAddError("");
    setAddModalOpen(true);
  };

  const submitCustomExercise = async (e) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) {
      setAddError("Please enter an exercise name.");
      return;
    }
    if (trimmed.length > 50) {
      setAddError("Name must be 50 characters or less.");
      return;
    }

    let resolvedBodyPart;
    if (bodyPartSelect === BODY_PART_CUSTOM) {
      const bp = bodyPartCustomText.trim().toLowerCase();
      if (!bp) {
        setAddError("Please enter a body part.");
        return;
      }
      if (bp.length > 50) {
        setAddError("Body part must be 50 characters or less.");
        return;
      }
      resolvedBodyPart = bp;
    } else {
      resolvedBodyPart = bodyPartSelect;
    }

    setAddSubmitting(true);
    setAddError("");
    try {
      await createCustomExercise({ name: trimmed, body_part: resolvedBodyPart });
      setAddModalOpen(false);
      setCustomName("");
      // Refresh catalog without blocking UI — awaiting GET here left the modal stuck if that request hung.
      void reloadApiExercises();
    } catch (err) {
      setAddError(err.message || "Could not add exercise.");
    } finally {
      setAddSubmitting(false);
    }
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
          onClick={() =>
            navigate("/doublecheck", {
              state: { selectedByDay, source: flowSource, planMeta },
            })
          }
        >
          CONTINUE
        </button>
      </div>

      <h1 style={{ textAlign: "center", margin: "0 0 10px" }}>List of Exercises</h1>
      <div className="list-exercises-panel">
        <div className="list-exercises-head">
          <button
            type="button"
            className="list-exercises-link list-exercises-link-btn"
            onClick={openAddModal}
            aria-haspopup="dialog"
          >
            Don&apos;t see an exercise? Add your own
          </button>
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
            {catalogFilterGroups.map((g) => (
              <option key={g} value={g}>
                {filterLabel(g)}
              </option>
            ))}
          </select>
        </div>

        <div className="list-exercises-grid">
          {items.map((exercise) => (
            <button
              key={exercise.key || exercise.name}
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

      {addModalOpen ? (
        <div
          className="list-exercises-modal-overlay"
          role="presentation"
          onClick={() => !addSubmitting && setAddModalOpen(false)}
        >
          <div
            className="list-exercises-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="list-exercises-add-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="list-exercises-add-title" className="list-exercises-modal-title">
              Add your exercise
            </h2>
            <form onSubmit={submitCustomExercise}>
              <label className="list-exercises-modal-label">
                Exercise name
                <input
                  type="text"
                  className="list-exercises-modal-input"
                  value={customName}
                  onChange={(ev) => setCustomName(ev.target.value)}
                  placeholder="e.g. Cable crunch"
                  maxLength={50}
                  autoComplete="off"
                  disabled={addSubmitting}
                />
              </label>
              <label className="list-exercises-modal-label">
                Body part
                <select
                  className="list-exercises-modal-select"
                  value={bodyPartSelect}
                  onChange={(ev) => setBodyPartSelect(ev.target.value)}
                  disabled={addSubmitting}
                >
                  {BODY_PART_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value={BODY_PART_CUSTOM}>Add a body part…</option>
                </select>
              </label>
              {bodyPartSelect === BODY_PART_CUSTOM ? (
                <label className="list-exercises-modal-label">
                  Custom body part
                  <input
                    type="text"
                    className="list-exercises-modal-input"
                    value={bodyPartCustomText}
                    onChange={(ev) => setBodyPartCustomText(ev.target.value)}
                    placeholder="e.g. shoulders, calves, chest"
                    maxLength={50}
                    autoComplete="off"
                    disabled={addSubmitting}
                  />
                </label>
              ) : null}
              {addError ? (
                <p className="list-exercises-modal-error" role="alert">
                  {addError}
                </p>
              ) : null}
              <div className="list-exercises-modal-actions">
                <button
                  type="button"
                  className="list-exercises-modal-btn list-exercises-modal-btn--muted"
                  onClick={() => !addSubmitting && setAddModalOpen(false)}
                  disabled={addSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="list-exercises-modal-btn list-exercises-modal-btn--primary"
                  disabled={addSubmitting}
                >
                  {addSubmitting ? "Saving…" : "Add exercise"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ListOfExercises;
