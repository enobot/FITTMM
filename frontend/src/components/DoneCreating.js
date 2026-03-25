import React from "react";
import { useNavigate } from "react-router-dom";
import "./DoneCreating.css";

function DoneCreating() {
  const navigate = useNavigate();

  return (
    <div className="done-creating">
      <div className="done-creating-content">
        <p className="done-creating-copy">
          Yay! You are all done.
          <br />
          Remember to record your reps, sets,
          <br />
          and weight used in order for us to help keep track
          <br />
          of your training volume. Have a good workout!
        </p>

        <div className="done-creating-action">
          <button
            type="button"
            className="done-creating-btn"
            onClick={() => navigate("/homepage")}
          >
            Let&apos;s go!
          </button>
          <img
            className="done-creating-spongebob"
            src="/pictures/spongebob.jpeg"
            alt="SpongeBob cheering"
          />
          <p className="done-creating-quote">
            "If you believe in yourself, with a tiny pinch of magic, all your dreams can come true!" -Spongebob
          </p>
        </div>
      </div>

      <div className="done-creating-dots" aria-hidden>
        <span className="done-creating-dot" />
        <span className="done-creating-dot" />
        <span className="done-creating-dot" />
        <span className="done-creating-dot done-creating-dot--active" />
      </div>
    </div>
  );
}

export default DoneCreating;
