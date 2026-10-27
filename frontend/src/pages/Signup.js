import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout, SocialButtons, OrDivider, PasswordInput } from "../auth/AuthLayout";
import {
  authErrorMessage,
  passwordProblem,
  signInWithProvider,
  signUpWithEmail,
} from "../auth/authService";
import { destinationAfterSignIn, savePendingProfile } from "../auth/afterSignIn";
import { useRedirectSignIn } from "../auth/useRedirectSignIn";
import { ageFrom } from "../utils/units";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer not to say", label: "Prefer not to say" },
];

function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const redirect = useRedirectSignIn();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!birthday) {
      setError("Please select your birthday.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const age = ageFrom(birthday);
    if (age == null || age < 13) {
      setError("You need to be at least 13 to use FITTMM.");
      return;
    }
    if (age > 120) {
      setError("Check your birthday; that year looks off.");
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      // The API only accepts these once the email is verified, so keep them until then
      savePendingProfile({
        email: email.trim().toLowerCase(),
        fname: firstName.trim(),
        lname: lastName.trim(),
        date_of_birth: birthday,
        gender: gender || null,
      });
      await signUpWithEmail({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      navigate("/verify-email", { replace: true });
    } catch (err) {
      setError(authErrorMessage(err) || "");
      setBusy(false);
    }
  };

  const handleProvider = async (which) => {
    setError("");
    setBusy(true);
    try {
      const { user } = await signInWithProvider(which, true);
      if (user) navigate(await destinationAfterSignIn(), { replace: true });
    } catch (err) {
      setError(authErrorMessage(err) || "");
      setBusy(false);
    }
  };

  return (
    <AuthLayout wide>
      <h1>Create your account</h1>
      <p className="auth-lede">Free, and your plan follows you to the Android app.</p>

      <SocialButtons onSelect={handleProvider} busy={busy} />
      <OrDivider />

      <form onSubmit={handleSubmit} noValidate>
        {(error || redirect.error) && (
          <p className="f-alert" role="alert">
            {error || redirect.error}
          </p>
        )}

        <div className="auth-row">
          <div className="f-field">
            <label className="f-label" htmlFor="su-first">
              First name
            </label>
            <input
              id="su-first"
              className="f-input"
              type="text"
              placeholder="First Name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="f-field">
            <label className="f-label" htmlFor="su-last">
              Last name
            </label>
            <input
              id="su-last"
              className="f-input"
              type="text"
              placeholder="Last Name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="f-field">
          <label className="f-label" htmlFor="su-birthday">
            Birthday
          </label>
          <input
            id="su-birthday"
            className="f-input"
            type="date"
            placeholder="Birthday"
            autoComplete="bday"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <p className="f-hint">Used to show your age in Settings. You must be 13 or older.</p>
        </div>

        <fieldset className="auth-fieldset">
          <legend className="f-label">Gender (optional)</legend>
          <div className="auth-choices">
            {GENDERS.map((g) => (
              <label key={g.value} className="auth-choice">
                <input
                  type="radio"
                  name="gender"
                  value={g.value}
                  checked={gender === g.value}
                  onChange={(e) => setGender(e.target.value)}
                />
                <span>{g.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="f-field">
          <label className="f-label" htmlFor="su-email">
            Email
          </label>
          <input
            id="su-email"
            className="f-input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="f-hint">We'll send a link to confirm it's you.</p>
        </div>

        <div className="auth-row">
          <div className="f-field">
            <label className="f-label" htmlFor="su-password">
              Password
            </label>
            <PasswordInput
              id="su-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="new-password"
              showMeter
            />
          </div>
          <div className="f-field">
            <label className="f-label" htmlFor="su-confirm">
              Confirm password
            </label>
            <PasswordInput
              id="su-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className="f-hint" style={{ marginTop: "-8px", marginBottom: "20px" }}>
          At least 8 characters, with a letter and a number.
        </p>

        <button type="submit" className="f-btn f-btn--primary f-btn--block" disabled={busy}>
          {busy ? "Creating your account…" : "Sign up"}
        </button>

        <p className="auth-foot">
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default Signup;
