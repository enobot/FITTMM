import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout, PasswordInput } from "../auth/AuthLayout";
import {
  applyEmailActionCode,
  authErrorMessage,
  checkActionCode,
  passwordProblem,
  resetPasswordWithCode,
} from "../auth/authService";
import { useAuth } from "../auth/AuthContext";

// Action codes are single-use; share one request per code so React's
// development double-run of effects doesn't spend the code twice.
const runs = new Map();
function once(key, fn) {
  if (!runs.has(key)) runs.set(key, fn());
  return runs.get(key);
}

/**
 * Handles links from Firebase's emails when the project's action URL points
 * here (Firebase console > Authentication > Templates > Customize action URL).
 */
function AuthAction() {
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") || "";
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [status, setStatus] = useState("working"); // working | done | form | error
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (mode === "verifyEmail") {
          await once(`verify:${oobCode}`, () => applyEmailActionCode(oobCode));
          if (!cancelled) setStatus("done");
          refresh();
        } else if (mode === "resetPassword") {
          const result = await once(`check:${oobCode}`, () => checkActionCode(oobCode));
          if (!cancelled) {
            setInfo(result?.data?.email || "");
            setStatus("form");
          }
        } else if (mode === "recoverEmail") {
          const result = await once(`recover:${oobCode}`, async () => {
            const checked = await checkActionCode(oobCode);
            await applyEmailActionCode(oobCode);
            return checked;
          });
          if (!cancelled) {
            setInfo(result?.data?.email || "");
            setStatus("done");
          }
        } else {
          throw new Error("This link isn't one FITTMM recognizes.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(authErrorMessage(err) || "");
          setStatus("error");
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode, refresh]);

  const savePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await resetPasswordWithCode(oobCode, password);
      setStatus("done");
    } catch (err) {
      setError(authErrorMessage(err) || "");
    }
    setBusy(false);
  };

  let body;
  if (status === "working") {
    body = <p className="auth-lede" role="status">Checking your link…</p>;
  } else if (status === "error") {
    body = (
      <>
        <h1>Link didn't work</h1>
        <p className="f-alert" role="alert">
          {error}
        </p>
        <p className="auth-foot">
          <Link to="/forgot-password">Request a new reset link</Link> or <Link to="/">log in</Link>.
        </p>
      </>
    );
  } else if (status === "form") {
    body = (
      <>
        <h1>Choose a new password</h1>
        <p className="auth-lede">{info ? `For ${info}.` : null}</p>
        <form onSubmit={savePassword} noValidate>
          {error ? (
            <p className="f-alert" role="alert">
              {error}
            </p>
          ) : null}
          <div className="f-field">
            <label className="f-label" htmlFor="aa-new">
              New password
            </label>
            <PasswordInput
              id="aa-new"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              showMeter
            />
          </div>
          <div className="f-field">
            <label className="f-label" htmlFor="aa-new2">
              Confirm new password
            </label>
            <PasswordInput
              id="aa-new2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="f-btn f-btn--primary f-btn--block" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </>
    );
  } else if (mode === "resetPassword") {
    body = (
      <>
        <h1>Password changed</h1>
        <p className="auth-lede">Log in with your new password.</p>
        <Link to="/" className="f-btn f-btn--primary">
          Log in
        </Link>
      </>
    );
  } else if (mode === "recoverEmail") {
    body = (
      <>
        <h1>Email restored</h1>
        <p className="auth-lede">
          Your sign-in email is back to {info || "your previous address"}. If you didn't ask for the change,
          reset your password now.
        </p>
        <Link to="/forgot-password" className="f-btn f-btn--primary">
          Reset password
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <h1>Email verified</h1>
        <p className="auth-lede">Thanks. Your account is ready.</p>
        <button
          type="button"
          className="f-btn f-btn--primary"
          onClick={() => navigate(user ? "/welcome" : "/", { replace: true })}
        >
          {user ? "Set up your profile" : "Log in"}
        </button>
      </>
    );
  }

  return <AuthLayout>{body}</AuthLayout>;
}

export default AuthAction;
