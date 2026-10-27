import React, { useState } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { AuthLayout, SocialButtons, OrDivider, PasswordInput } from "../auth/AuthLayout";
import { authErrorMessage, signInWithEmail, signInWithProvider } from "../auth/authService";
import { useRedirectSignIn } from "../auth/useRedirectSignIn";
import { destinationAfterSignIn } from "../auth/afterSignIn";
import { useAuth, needsEmailVerification, AuthSplash } from "../auth/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, user, configError } = useAuth();
  const from = location.state?.from;
  const redirect = useRedirectSignIn(from);

  if (redirect.checking) return <AuthSplash />;

  // Already signed in (for example, "Keep me signed in" from last time)
  if (ready && user && !busy) {
    return <Navigate to={needsEmailVerification(user) ? "/verify-email" : from || "/homepage"} replace />;
  }

  const finish = async () => {
    navigate(await destinationAfterSignIn(from), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm || !password) {
      setError("Please enter email and password.");
      return;
    }

    setBusy(true);
    try {
      await signInWithEmail(emailNorm, password, remember);
      await finish();
    } catch (err) {
      setError(authErrorMessage(err) || "");
      setBusy(false);
    }
  };

  const handleProvider = async (which) => {
    setError("");
    setBusy(true);
    try {
      const { user: signedIn } = await signInWithProvider(which, remember);
      if (signedIn) await finish();
    } catch (err) {
      setError(authErrorMessage(err) || "");
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1>Log in</h1>
      <p className="auth-lede">Welcome back. Your week is waiting.</p>

      {configError ? <p className="f-alert">{configError}</p> : null}
      {error || redirect.error ? (
        <p className="f-alert" role="alert">
          {error || redirect.error}
        </p>
      ) : null}

      <SocialButtons onSelect={handleProvider} busy={busy} />
      <OrDivider />

      <form onSubmit={handleSubmit} noValidate>
        <div className="f-field">
          <label className="f-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="f-input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="f-field">
          <div className="auth-label-row">
            <label className="f-label" htmlFor="login-password">
              Password
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
        </div>

        <label className="auth-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in on this device
        </label>

        <button type="submit" className="f-btn f-btn--primary f-btn--block" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="auth-foot">
        New to FITTMM? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
