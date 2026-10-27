import React, { useState } from "react";
import { Link } from "react-router-dom";
import PlateStack from "../components/PlateStack";
import { passwordStrength } from "./authService";
import "./Auth.css";

export function AuthLayout({ children, wide = false }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <Link to="/" className="auth-wordmark f-display" aria-label="FITTMM home">
          FITTMM
        </Link>
        <p className="auth-tagline">Plan your week, log every set, and watch your volume climb.</p>
        <PlateStack decorative className="auth-plates" />
      </aside>
      <main className="auth-main">
        <div className={`auth-card ${wide ? "auth-card--wide" : ""}`}>{children}</div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 384 512" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </svg>
  );
}

/** "Continue with Google / Apple". onSelect receives "google" or "apple". */
export function SocialButtons({ onSelect, busy }) {
  return (
    <div className="auth-social">
      <button type="button" className="f-btn auth-social-btn" onClick={() => onSelect("google")} disabled={busy}>
        <GoogleMark />
        Continue with Google
      </button>
      <button
        type="button"
        className="f-btn auth-social-btn auth-social-btn--apple"
        onClick={() => onSelect("apple")}
        disabled={busy}
      >
        <AppleMark />
        Continue with Apple
      </button>
    </div>
  );
}

export function OrDivider({ children = "or use email" }) {
  return (
    <div className="auth-or" role="separator">
      <span>{children}</span>
    </div>
  );
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

/** Password input with show/hide and an optional strength meter. */
export function PasswordInput({ id, value, onChange, placeholder, autoComplete, showMeter, invalid, describedBy }) {
  const [visible, setVisible] = useState(false);
  const score = passwordStrength(value);
  return (
    <>
      <div className="auth-password">
        <input
          id={id}
          className="f-input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {showMeter && value ? (
        <div className="auth-meter" aria-live="polite">
          <div className="auth-meter-track" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`auth-meter-seg ${i < score ? `auth-meter-seg--on auth-meter-seg--${score}` : ""}`} />
            ))}
          </div>
          <span className="auth-meter-label">{STRENGTH_LABELS[score]}</span>
        </div>
      ) : null}
    </>
  );
}
