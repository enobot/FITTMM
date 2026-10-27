import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "../auth/AuthLayout";
import { useAuth, needsEmailVerification, AuthSplash } from "../auth/AuthContext";
import {
  authErrorMessage,
  refreshVerification,
  resendVerificationEmail,
  signOutEverywhere,
} from "../auth/authService";
import { destinationAfterSignIn } from "../auth/afterSignIn";

const RESEND_WAIT_SECONDS = 60;

function VerifyEmail() {
  const { ready, user, refresh } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS);

  const proceed = useCallback(async () => {
    await refresh();
    navigate(await destinationAfterSignIn(), { replace: true });
  }, [navigate, refresh]);

  // Notice the click on the email link, even from another tab
  useEffect(() => {
    if (!user || !needsEmailVerification(user)) return undefined;
    const id = setInterval(async () => {
      try {
        if (await refreshVerification()) proceed();
      } catch (_) {}
    }, 5000);
    return () => clearInterval(id);
  }, [user, proceed]);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (!ready) return <AuthSplash />;
  if (!user) return <Navigate to="/" replace />;
  if (!needsEmailVerification(user)) return <Navigate to="/homepage" replace />;

  const check = async () => {
    setError("");
    setMessage("");
    setChecking(true);
    try {
      if (await refreshVerification()) {
        await proceed();
        return;
      }
      setError("Your email isn't verified yet. Open the link in the email we sent, then try again.");
    } catch (err) {
      setError(authErrorMessage(err) || "");
    }
    setChecking(false);
  };

  const resend = async () => {
    setError("");
    setMessage("");
    try {
      await resendVerificationEmail();
      setMessage(`Sent a new link to ${user.email}.`);
      setWait(RESEND_WAIT_SECONDS);
    } catch (err) {
      setError(authErrorMessage(err) || "");
    }
  };

  const useDifferentEmail = async () => {
    await signOutEverywhere();
    navigate("/signup", { replace: true });
  };

  return (
    <AuthLayout>
      <h1>Check your email</h1>
      <p className="auth-lede">
        We sent a link to <strong>{user.email}</strong>. Open it to confirm your address, and this
        page will continue on its own.
      </p>

      {message ? (
        <p className="f-alert f-alert--ok" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="f-alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="auth-actions">
        <button type="button" className="f-btn f-btn--primary" onClick={check} disabled={checking}>
          {checking ? "Checking…" : "I've verified my email"}
        </button>
        <button type="button" className="f-btn f-btn--quiet" onClick={resend} disabled={wait > 0}>
          {wait > 0 ? `Resend in ${wait}s` : "Resend email"}
        </button>
      </div>

      <p className="auth-foot">
        Can't find it? Check your spam folder. Wrong address?{" "}
        <button type="button" className="f-link" onClick={useDifferentEmail}>
          Use a different email
        </button>
      </p>
      <p className="auth-foot">
        <button
          type="button"
          className="f-link"
          onClick={async () => {
            await signOutEverywhere();
            navigate("/", { replace: true });
          }}
        >
          Back to log in
        </button>
      </p>
    </AuthLayout>
  );
}

export default VerifyEmail;
