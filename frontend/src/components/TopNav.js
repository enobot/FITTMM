import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { signOutEverywhere } from "../auth/authService";
import { useTheme } from "../theme";
import "./TopNav.css";

const LINKS = [
  { to: "/homepage", label: "Home" },
  { to: "/exercises", label: "Exercises" },
  { to: "/volume", label: "Volume" },
];

function initials(me, user) {
  const name = [me?.fname, me?.lname].filter(Boolean).join(" ") || user?.displayName || user?.email || "";
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function TopNav() {
  const navigate = useNavigate();
  const { me, user } = useAuth();
  const { isDark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logOut = async () => {
    setOpen(false);
    try {
      await signOutEverywhere();
    } finally {
      localStorage.removeItem("token");
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="topnav">
      <Link to="/homepage" className="topnav-mark f-display" aria-label="FITTMM home">
        FITTMM
      </Link>
      <nav className="topnav-links" aria-label="Main">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className="topnav-link">
            {l.label}
          </NavLink>
        ))}
        <NavLink
          to="/listOfExercises"
          state={{ source: "weekly-edit" }}
          className="topnav-link"
        >
          Plan
        </NavLink>
      </nav>
      <div className="topnav-actions">
        <Link to="/recordWorkout" className="f-btn f-btn--primary topnav-record">
          Record workout
        </Link>
        <div className="topnav-menu" ref={menuRef}>
          <button
            type="button"
            className="topnav-avatar"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
            onClick={() => setOpen((o) => !o)}
          >
            {initials(me, user)}
          </button>
          {open ? (
            <div className="topnav-dropdown" role="menu">
              <p className="topnav-who">
                <strong>{[me?.fname, me?.lname].filter(Boolean).join(" ") || user?.displayName || "Your account"}</strong>
                <span>{user?.email}</span>
              </p>
              <Link role="menuitem" to="/settings" className="topnav-item" onClick={() => setOpen(false)}>
                Settings
              </Link>
              <button role="menuitem" type="button" className="topnav-item" onClick={toggle}>
                {isDark ? "Use light theme" : "Use dark theme"}
              </button>
              <button role="menuitem" type="button" className="topnav-item" onClick={logOut}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
