import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import { getExercise, getExerciseVideos, searchVideos } from "../api/accountApi";
import { bodyPartLabel } from "./ExerciseLibrary";
import "./ExerciseDetail.css";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function formatDuration(sec) {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function VideoPanel({ exercise }) {
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState(exercise.video_query);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExerciseVideos(exercise.id)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setSelected(r.videos[0] || null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [exercise.id]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError("");
    try {
      const r = await searchVideos(query.trim());
      setResult(r);
      setSelected(r.videos[0] || null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const youtubeLink = result?.search_url ||
    `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.video_query)}`;

  return (
    <section className="exd-watch" aria-labelledby="exd-watch-title">
      <h2 id="exd-watch-title" className="exd-h2">
        Watch how it's done
      </h2>

      <div className="exd-player">
        {selected ? (
          <iframe
            key={selected.video_id}
            src={`https://www.youtube-nocookie.com/embed/${selected.video_id}?rel=0`}
            title={selected.title}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="exd-player-empty">
            {loading ? (
              <span role="status">Finding tutorial videos…</span>
            ) : result && !result.configured ? (
              <>
                <span>Video picks aren't set up on this server yet.</span>
                <a className="f-btn f-btn--primary" href={youtubeLink} target="_blank" rel="noopener noreferrer">
                  Search YouTube for this exercise
                </a>
              </>
            ) : (
              <span>No videos found. Try different words below.</span>
            )}
          </div>
        )}
      </div>
      {selected ? (
        <p className="exd-now">
          <strong>{selected.title}</strong>
          <span>{selected.channel}</span>
        </p>
      ) : null}

      {error || result?.error ? (
        <p className="f-alert" role="alert">
          {error || result.error}
        </p>
      ) : null}

      {result?.configured !== false ? (
        <form className="exd-search" onSubmit={runSearch} role="search">
          <label className="f-visually-hidden" htmlFor="exd-q">
            Search tutorial videos
          </label>
          <input
            id="exd-q"
            className="f-input"
            type="search"
            value={query}
            maxLength={150}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="f-btn f-btn--quiet" disabled={loading}>
            {loading ? "Searching…" : "Search videos"}
          </button>
        </form>
      ) : null}

      {result?.videos?.length ? (
        <ul className="exd-videos" aria-label="Choose a video">
          {result.videos.map((v) => (
            <li key={v.video_id}>
              <button
                type="button"
                className="exd-video"
                aria-pressed={selected?.video_id === v.video_id}
                onClick={() => setSelected(v)}
              >
                <span className="exd-thumb">
                  <img src={v.thumbnail} alt="" loading="lazy" />
                  {v.duration_seconds != null ? <span className="exd-dur">{formatDuration(v.duration_seconds)}</span> : null}
                </span>
                <span className="exd-video-text">
                  <span className="exd-video-title">{v.title}</span>
                  <span className="exd-video-meta">
                    {v.channel}
                    {v.view_count != null ? `, ${compact.format(v.view_count)} views` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {result?.configured ? (
        <p className="exd-more">
          Want more?{" "}
          <a href={youtubeLink} target="_blank" rel="noopener noreferrer">
            See all results on YouTube
          </a>
        </p>
      ) : null}
    </section>
  );
}

function ExerciseDetail() {
  const { id } = useParams();
  const [exercise, setExercise] = useState(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setExercise(null);
    setError("");
    setPhoto(0);
    getExercise(id)
      .then((ex) => !cancelled && setExercise(ex))
      .catch((err) => !cancelled && setError(err.status === 404 ? "That exercise doesn't exist." : err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="page">
      <TopNav />
      <main className="exd">
        <Link to="/exercises" className="exd-back">
          All exercises
        </Link>

        {error ? (
          <p className="f-alert" role="alert">
            {error}
          </p>
        ) : null}
        {!exercise && !error ? <p role="status">Loading…</p> : null}

        {exercise ? (
          <>
            <header className="exd-head">
              <h1 className="f-display exd-title">{exercise.name}</h1>
              <ul className="exd-tags" aria-label="Details">
                {exercise.body_part ? <li>{bodyPartLabel(exercise.body_part)}</li> : null}
                {exercise.equipment ? <li>{cap(exercise.equipment)}</li> : null}
                {exercise.level ? <li>{cap(exercise.level)}</li> : null}
                {exercise.category ? <li>{cap(exercise.category)}</li> : null}
              </ul>
            </header>

            <div className="exd-grid">
              <VideoPanel exercise={exercise} />

              <aside className="exd-learn">
                {exercise.images.length ? (
                  <figure className="exd-photos">
                    <img
                      src={exercise.images[Math.min(photo, exercise.images.length - 1)]}
                      alt={`${exercise.name}, ${photo === 0 ? "starting" : "ending"} position`}
                    />
                    {exercise.images.length > 1 ? (
                      <figcaption className="exd-photo-toggle" role="group" aria-label="Position">
                        {exercise.images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-pressed={photo === i}
                            onClick={() => setPhoto(i)}
                          >
                            {i === 0 ? "Start" : i === exercise.images.length - 1 ? "Finish" : `Step ${i + 1}`}
                          </button>
                        ))}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}

                {exercise.instructions.length ? (
                  <section aria-labelledby="exd-steps">
                    <h2 id="exd-steps" className="exd-h2">
                      Step by step
                    </h2>
                    <ol className="exd-steps">
                      {exercise.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {exercise.tips.length ? (
                  <section aria-labelledby="exd-tips">
                    <h2 id="exd-tips" className="exd-h2">
                      Form pointers
                    </h2>
                    <ul className="exd-tips">
                      {exercise.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {exercise.primary_muscles.length ? (
                  <section aria-labelledby="exd-muscles">
                    <h2 id="exd-muscles" className="exd-h2">
                      Muscles worked
                    </h2>
                    <dl className="exd-muscles">
                      <dt>Main</dt>
                      <dd>{exercise.primary_muscles.map(cap).join(", ")}</dd>
                      {exercise.secondary_muscles.length ? (
                        <>
                          <dt>Also</dt>
                          <dd>{exercise.secondary_muscles.map(cap).join(", ")}</dd>
                        </>
                      ) : null}
                    </dl>
                  </section>
                ) : null}
              </aside>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default ExerciseDetail;
