import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout, PasswordInput } from "../auth/AuthLayout";
import {
  authErrorMessage,
  confirmRecoveryCode,
  formatPhone,
  normalizePhone,
  passwordProblem,
  sendPasswordReset,
  sendRecoveryCode,
  setNewPassword,
} from "../auth/authService";
import { destinationAfterSignIn } from "../auth/afterSignIn";

function EmailReset() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Enter the email you signed up with.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(value);
      setSentTo(value);
    } catch (err) {
      // Don't reveal whether an account exists; only show input problems
      if (err.code === "auth/user-not-found") setSentTo(value);
      else setError(authErrorMessage(err) || "");
    }
    setBusy(false);
  };

  if (sentTo) {
    return (
      <div role="status">
        <p className="f-alert f-alert--ok">
          If an account uses <strong>{sentTo}</strong>, a reset link is on its way. It expires in an hour.
        </p>
        <p className="auth-foot">
          No email after a few minutes? Check spam, or{" "}
          <button type="button" className="f-link" onClick={() => setSentTo("")}>
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {error ? (
        <p className="f-alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="f-field">
        <label className="f-label" htmlFor="fp-email">
          Email
        </label>
        <input
          id="fp-email"
          className="f-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className="f-btn f-btn--primary f-btn--block" disabled={busy}>
        {busy ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}

function PhoneReset() {
  const navigate = useNavigate();
  const [step, setStep] = useState("phone"); // phone -> code -> password
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError("Enter a full phone number, like +1 555 123 4567.");
      return;
    }
    setBusy(true);
    try {
      setConfirmation(await sendRecoveryCode(e164, "fp-recaptcha"));
      setStep("code");
    } catch (err) {
      setError(authErrorMessage(err) || "");
    }
    setBusy(false);
  };

  const checkCode = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the text message.");
      return;
    }
    setBusy(true);
    try {
      const user = await confirmRecoveryCode(confirmation, code);
      setHasPassword(user.providerData.some((p) => p.providerId === "password"));
      setStep("password");
    } catch (err) {
      setError(authErrorMessage(err) || "");
    }
    setBusy(false);
  };

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
      await setNewPassword(password);
      navigate(await destinationAfterSignIn(), { replace: true });
    } catch (err) {
      setError(authErrorMessage(err) || "");
      setBusy(false);
    }
  };

  const alert = error ? (
    <p className="f-alert" role="alert">
      {error}
    </p>
  ) : null;

  if (step === "password") {
    if (!hasPassword) {
      return (
        <div>
          <p className="f-alert f-alert--ok">
            You're signed in. Your account uses Google or Apple to log in, so there's no password to reset.
          </p>
          <button
            type="button"
            className="f-btn f-btn--primary f-btn--block"
            onClick={async () => navigate(await destinationAfterSignIn(), { replace: true })}
          >
            Continue to FITTMM
          </button>
        </div>
      );
    }
    return (
      <form onSubmit={savePassword} noValidate>
        <p className="f-alert f-alert--ok">Code accepted. Choose a new password.</p>
        {alert}
        <div className="f-field">
          <label className="f-label" htmlFor="fp-new">
            New password
          </label>
          <PasswordInput
            id="fp-new"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            showMeter
          />
        </div>
        <div className="f-field">
          <label className="f-label" htmlFor="fp-new2">
            Confirm new password
          </label>
          <PasswordInput
            id="fp-new2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="f-btn f-btn--primary f-btn--block" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={checkCode} noValidate>
        <p className="auth-lede" style={{ fontSize: "1rem" }}>
          We texted a 6-digit code to {formatPhone(normalizePhone(phone))}.
        </p>
        {alert}
        <div className="f-field">
          <label className="f-label" htmlFor="fp-code">
            Code
          </label>
          <input
            id="fp-code"
            className="f-input auth-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="auth-actions">
          <button type="submit" className="f-btn f-btn--primary" disabled={busy}>
            {busy ? "Checking…" : "Verify code"}
          </button>
          <button
            type="button"
            className="f-btn f-btn--quiet"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
            }}
          >
            Use a different number
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate>
      {alert}
      <div className="f-field">
        <label className="f-label" htmlFor="fp-phone">
          Recovery phone
        </label>
        <input
          id="fp-phone"
          className="f-input"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="f-hint">The number you added in Settings. Message and data rates may apply.</p>
      </div>
      <button type="submit" className="f-btn f-btn--primary f-btn--block" disabled={busy}>
        {busy ? "Sending…" : "Text me a code"}
      </button>
    </form>
  );
}

function ForgotPassword() {
  const [method, setMethod] = useState("email");

  return (
    <AuthLayout>
      <h1>Reset your password</h1>
      <p className="auth-lede">Get back in with a link by email or a code by text.</p>

      <div className="auth-tabs" role="tablist" aria-label="How to reset">
        <button
          type="button"
          role="tab"
          id="tab-email"
          aria-controls="panel-reset"
          aria-selected={method === "email"}
          className="auth-tab"
          onClick={() => setMethod("email")}
        >
          Email
        </button>
        <button
          type="button"
          role="tab"
          id="tab-phone"
          aria-controls="panel-reset"
          aria-selected={method === "phone"}
          className="auth-tab"
          onClick={() => setMethod("phone")}
        >
          Text message
        </button>
      </div>

      <div id="panel-reset" role="tabpanel" aria-labelledby={method === "email" ? "tab-email" : "tab-phone"}>
        {method === "email" ? <EmailReset /> : <PhoneReset />}
      </div>
      <div id="fp-recaptcha" />

      <p className="auth-foot">
        Remembered it? <Link to="/">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;
