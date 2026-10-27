import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import { useExerciseCatalog } from "../hooks/useExerciseCatalog";
import "./ExerciseLibrary.css";

const PAGE = 48;

const BODY_PARTS = [
  ["chest", "Chest"],
  ["back", "Back"],
  ["shoulders", "Shoulders"],
  ["bicep", "Biceps"],
  ["triceps", "Triceps"],
  ["forearms", "Forearms"],
  ["abs", "Abs"],
  ["glutes", "Glutes"],
  ["legs", "Legs"],
  ["neck", "Neck"],
];

export const bodyPartLabel = (bp) =>
  (BODY_PARTS.find(([v]) => v === bp) || [null, bp ? bp.charAt(0).toUpperCase() + bp.slice(1) : ""])[1];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function ExerciseLibrary() {
  const { exercises, loading, error, reload } = useExerciseCatalog();
  const [params, setParams] = useSearchParams();
  const [shown, setShown] = useState(PAGE);

  const q = params.get("q") || "";
  const part = params.get("part") || "";
  const equipment = params.get("equipment") || "";
  const level = params.get("level") || "";

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const equipmentOptions = useMemo(
    () => [...new Set(exercises.map((e) => e.equipment).filter(Boolean))].sort(),
    [exercises]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (!needle || e.name.toLowerCase().includes(needle)) &&
        (!part || e.body_part === part) &&
        (!equipment || e.equipment === equipment) &&
        (!level || e.level === level)
    );
  }, [exercises, q, part, equipment, level]);

  const visible = filtered.slice(0, shown);
  const filtersOn = q || part || equipment || level;

  return (
    <div className="page">
      <TopNav />
      <main className="lib">
        <header className="lib-head">
          <h1 className="f-display lib-title">Exercises</h1>
          <p className="lib-sub">
            {exercises.length ? `${exercises.length.toLocaleString("en-US")} exercises with photos, steps and tutorial videos.` : " "}
          </p>
        </header>

        <div className="lib-filters" role="search">
          <div className="f-field lib-search">
            <label className="f-label" htmlFor="lib-q">
              Search
            </label>
            <input
              id="lib-q"
              className="f-input"
              type="search"
              placeholder="Squat, row, curl…"
              value={q}
              onChange={(e) => update("q", e.target.value)}
            />
          </div>
          <div className="f-field">
            <label className="f-label" htmlFor="lib-eq">
              Equipment
            </label>
            <select id="lib-eq" className="f-select" value={equipment} onChange={(e) => update("equipment", e.target.value)}>
              <option value="">Any</option>
              {equipmentOptions.map((eq) => (
                <option key={eq} value={eq}>
                  {cap(eq)}
                </option>
              ))}
            </select>
          </div>
          <div className="f-field">
            <label className="f-label" htmlFor="lib-level">
              Level
            </label>
            <select id="lib-level" className="f-select" value={level} onChange={(e) => update("level", e.target.value)}>
              <option value="">Any</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div className="lib-parts" role="group" aria-label="Body part">
          <button type="button" className="lib-chip" aria-pressed={!part} onClick={() => update("part", "")}>
            All
          </button>
          {BODY_PARTS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="lib-chip"
              aria-pressed={part === value}
              onClick={() => update("part", part === value ? "" : value)}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="f-alert" role="alert">
            {error}{" "}
            <button type="button" className="f-link" onClick={() => reload(true)}>
              Try again
            </button>
          </p>
        ) : null}

        <p className="lib-count" aria-live="polite">
          {loading
            ? "Loading exercises…"
            : `${filtered.length.toLocaleString("en-US")} ${filtered.length === 1 ? "exercise" : "exercises"}`}
          {filtersOn && !loading ? (
            <>
              {" "}
              <button type="button" className="f-link" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </button>
            </>
          ) : null}
        </p>

        {!loading && filtered.length === 0 ? (
          <p className="lib-empty">
            Nothing matches. Try a shorter search, or add it as your own exercise when you build your plan.
          </p>
        ) : null}

        <ul className="lib-grid">
          {visible.map((ex) => (
            <li key={ex.id}>
              <Link to={`/exercises/${ex.id}`} className="lib-card">
                <span className="lib-photo">
                  {ex.image ? (
                    <img src={ex.image} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="lib-photo-none f-display">{ex.name.slice(0, 1)}</span>
                  )}
                </span>
                <span className="lib-name">{ex.name}</span>
                <span className="lib-tags">
                  {ex.body_part ? <span>{bodyPartLabel(ex.body_part)}</span> : null}
                  {ex.equipment ? <span>{cap(ex.equipment)}</span> : null}
                  {ex.userid != null ? <span className="lib-tag-mine">Yours</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {filtered.length > shown ? (
          <div className="lib-more">
            <button type="button" className="f-btn f-btn--quiet" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, filtered.length - shown)} more
            </button>
          </div>
        ) : null}

        <p className="lib-credit">
          Photos and instructions from free-exercise-db, released into the public domain.
        </p>
      </main>
    </div>
  );
}

export default ExerciseLibrary;
