import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import TopNav from "../components/TopNav";
import ProfileForm from "../components/ProfileForm";
import { PasswordInput } from "../auth/AuthLayout";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme";
import {
  addWeight,
  deleteAccountData,
  deleteWeight,
  getProfile,
  listWeights,
  localDateString,
  updateProfile,
  wipeAllData,
} from "../api/accountApi";
import {
  authErrorMessage,
  changePassword,
  confirmLinkPhoneCode,
  deleteFirebaseUser,
  linkProvider,
  formatPhone,
  normalizePhone,
  passwordProblem,
  providerName,
  reauthenticate,
  removeRecoveryPhone,
  sendLinkPhoneCode,
  signOutEverywhere,
  unlinkProvider,
} from "../auth/authService";
import { clearAllLocalUserData, getStoredUser } from "../utils/fittmmStorage";
import { invalidateExerciseCatalog } from "../hooks/useExerciseCatalog";
import { formatHeight, formatWeight, weightFromLb, weightToLb, weightUnit } from "../utils/units";
import "./Settings.css";

const SECTIONS = [
  ["profile", "Profile"],
  ["weight", "Body weight"],
  ["security", "Sign-in and security"],
  ["appearance", "Appearance"],
  ["data", "Your data"],
];

function Notice({ notice }) {
  if (!notice) return null;
  return (
    <p className={`f-alert ${notice.ok ? "f-alert--ok" : ""}`} role={notice.ok ? "status" : "alert"}>
      {notice.text}
    </p>
  );
}

// ---------------------------------------------------------------------------
function WeightSection({ profile, onChanged }) {
  const unit = profile.unit_system || "imperial";
  const [entries, setEntries] = useState([]);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(localDateString());
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => listWeights().then(setEntries).catch(() => setEntries([])), []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    const lb = weightToLb(value, unit);
    if (lb == null || lb < 20 || lb > 1000) {
      setNotice({ text: `Enter your weight in ${weightUnit(unit)}.` });
      return;
    }
    setBusy(true);
    try {
      await addWeight(lb, date);
      setValue("");
      setNotice({ ok: true, text: `Logged ${formatWeight(lb, unit)} for ${date}.` });
      await load();
      onChanged();
    } catch (err) {
      setNotice({ text: err.message });
    }
    setBusy(false);
  };

  const remove = async (id) => {
    try {
      await deleteWeight(id);
      await load();
      onChanged();
    } catch (err) {
      setNotice({ text: err.message });
    }
  };

  const chartData = useMemo(
    () =>
      [...entries]
        .reverse()
        .map((e) => ({ date: e.recorded_on, weight: weightFromLb(e.weight, unit) })),
    [entries, unit]
  );

  const change =
    profile.weight != null && profile.previous_weight != null
      ? weightFromLb(profile.weight, unit) - weightFromLb(profile.previous_weight, unit)
      : null;

  const action = getComputedStyle(document.documentElement).getPropertyValue("--action").trim();
  const rule = getComputedStyle(document.documentElement).getPropertyValue("--rule").trim();
  const inkSoft = getComputedStyle(document.documentElement).getPropertyValue("--ink-soft").trim();

  return (
    <>
      <dl className="set-figures">
        <div>
          <dt>Current</dt>
          <dd className="f-num">{formatWeight(profile.weight, unit)}</dd>
        </div>
        <div>
          <dt>Previous</dt>
          <dd className="f-num">{formatWeight(profile.previous_weight, unit)}</dd>
          {change != null ? (
            <dd className="set-figure-note">
              {change === 0 ? "No change" : `${change > 0 ? "Up" : "Down"} ${Math.abs(Math.round(change * 10) / 10)} ${weightUnit(unit)}`}
            </dd>
          ) : null}
        </div>
        <div>
          <dt>Goal</dt>
          <dd className="f-num">{formatWeight(profile.goal_weight, unit)}</dd>
          {profile.goal_weight && profile.weight ? (
            <dd className="set-figure-note">
              {Math.abs(Math.round((weightFromLb(profile.weight, unit) - weightFromLb(profile.goal_weight, unit)) * 10) / 10)}{" "}
              {weightUnit(unit)} to go
            </dd>
          ) : null}
        </div>
      </dl>

      {chartData.length > 1 ? (
        <div className="set-chart" aria-label="Body weight over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={rule} />
              <XAxis dataKey="date" tick={{ fill: inkSoft, fontSize: 12 }} tickLine={false} axisLine={{ stroke: rule }} minTickGap={24} />
              <YAxis
                domain={["dataMin - 3", "dataMax + 3"]}
                tick={{ fill: inkSoft, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v) => [`${v} ${weightUnit(unit)}`, "Weight"]}
                contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 6 }}
              />
              <Line type="monotone" dataKey="weight" stroke={action} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <form className="set-inline-form" onSubmit={submit} noValidate>
        <div className="f-field">
          <label className="f-label" htmlFor="w-value">
            Weight ({weightUnit(unit)})
          </label>
          <input id="w-value" className="f-input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="f-field">
          <label className="f-label" htmlFor="w-date">
            Date
          </label>
          <input
            id="w-date"
            className="f-input"
            type="date"
            max={localDateString()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button type="submit" className="f-btn f-btn--primary" disabled={busy}>
          {busy ? "Logging…" : "Log weight"}
        </button>
      </form>
      <Notice notice={notice} />

      {entries.length ? (
        <details className="set-history">
          <summary>Weight history ({entries.length})</summary>
          <ul>
            {entries.map((e) => (
              <li key={e.id}>
                <span>{e.recorded_on}</span>
                <span className="f-num">{formatWeight(e.weight, unit)}</span>
                <button type="button" className="f-link" onClick={() => remove(e.id)} aria-label={`Delete ${e.recorded_on} entry`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="set-muted">No weigh-ins yet. Log one above to start your history.</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
function PasswordForm({ hasPassword, onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (next !== confirm) {
      setNotice({ text: "Passwords do not match." });
      return;
    }
    const problem = passwordProblem(next);
    if (problem) {
      setNotice({ text: problem });
      return;
    }
    if (hasPassword && !current) {
      setNotice({ text: "Enter your current password." });
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice({ ok: true, text: hasPassword ? "Password changed." : "Password added. You can now log in with your email too." });
      onDone();
    } catch (err) {
      setNotice({ text: authErrorMessage(err) || "" });
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="set-subform">
      <h3 className="set-h3">{hasPassword ? "Change password" : "Add a password"}</h3>
      {hasPassword ? (
        <div className="f-field">
          <label className="f-label" htmlFor="pw-current">
            Current password
          </label>
          <PasswordInput id="pw-current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
      ) : (
        <p className="set-muted">Lets you log in with your email as well as Google or Apple.</p>
      )}
      <div className="set-two">
        <div className="f-field">
          <label className="f-label" htmlFor="pw-new">
            New password
          </label>
          <PasswordInput id="pw-new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" showMeter />
        </div>
        <div className="f-field">
          <label className="f-label" htmlFor="pw-confirm">
            Confirm new password
          </label>
          <PasswordInput id="pw-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      <Notice notice={notice} />
      <button type="submit" className="f-btn f-btn--quiet" disabled={busy}>
        {busy ? "Saving…" : hasPassword ? "Change password" : "Add password"}
      </button>
    </form>
  );
}

function PhoneForm({ phoneNumber, onDone }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEditing(false);
    setVerificationId(null);
    setPhone("");
    setCode("");
  };

  const send = async (e) => {
    e.preventDefault();
    setNotice(null);
    const e164 = normalizePhone(phone);
    if (!e164) {
      setNotice({ text: "Enter a full phone number, like +1 555 123 4567." });
      return;
    }
    setBusy(true);
    try {
      setVerificationId(await sendLinkPhoneCode(e164, "set-recaptcha"));
    } catch (err) {
      setNotice({ text: authErrorMessage(err) || "" });
    }
    setBusy(false);
  };

  const confirmCode = async (e) => {
    e.preventDefault();
    setNotice(null);
    setBusy(true);
    try {
      await confirmLinkPhoneCode(verificationId, code);
      setNotice({ ok: true, text: `Recovery phone set to ${formatPhone(normalizePhone(phone))}.` });
      reset();
      onDone();
    } catch (err) {
      setNotice({ text: authErrorMessage(err) || "" });
    }
    setBusy(false);
  };

  const remove = async () => {
    setNotice(null);
    try {
      await removeRecoveryPhone();
      setNotice({ ok: true, text: "Recovery phone removed." });
      onDone();
    } catch (err) {
      setNotice({ text: authErrorMessage(err) || "" });
    }
  };

  return (
    <div className="set-subform">
      <h3 className="set-h3">Recovery phone</h3>
      <p className="set-muted">
        If you forget your password, we can text a code to this number instead of emailing you.
      </p>
      {!editing ? (
        <div className="set-line">
          <span className="f-num set-phone">{phoneNumber ? formatPhone(phoneNumber) : "Not added"}</span>
          <button type="button" className="f-btn f-btn--quiet" onClick={() => setEditing(true)}>
            {phoneNumber ? "Change" : "Add phone"}
          </button>
          {phoneNumber ? (
            <button type="button" className="f-link" onClick={remove}>
              Remove
            </button>
          ) : null}
        </div>
      ) : verificationId ? (
        <form onSubmit={confirmCode} noValidate className="set-inline-form">
          <div className="f-field">
            <label className="f-label" htmlFor="ph-code">
              6-digit code
            </label>
            <input
              id="ph-code"
              className="f-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <button type="submit" className="f-btn f-btn--primary" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Verify"}
          </button>
          <button type="button" className="f-btn f-btn--quiet" onClick={reset}>
            Cancel
          </button>
        </form>
      ) : (
        <form onSubmit={send} noValidate className="set-inline-form">
          <div className="f-field">
            <label className="f-label" htmlFor="ph-number">
              Phone number
            </label>
            <input
              id="ph-number"
              className="f-input"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button type="submit" className="f-btn f-btn--primary" disabled={busy}>
            {busy ? "Sending…" : "Text me a code"}
          </button>
          <button type="button" className="f-btn f-btn--quiet" onClick={reset}>
            Cancel
          </button>
        </form>
      )}
      <Notice notice={notice} />
      <div id="set-recaptcha" />
    </div>
  );
}

function SecuritySection() {
  const { user, refresh } = useAuth();
  const [notice, setNotice] = useState(null);
  if (!user) return null;
  const providers = user.providers.filter((p) => p !== "phone");
  const hasPassword = user.providers.includes("password");

  const connect = async (which) => {
    setNotice(null);
    try {
      await linkProvider(which);
      await refresh();
      setNotice({ ok: true, text: `${which === "google" ? "Google" : "Apple"} connected.` });
    } catch (err) {
      const msg = authErrorMessage(err);
      if (msg) setNotice({ text: msg });
    }
  };

  const disconnect = async (providerId) => {
    setNotice(null);
    try {
      await unlinkProvider(providerId);
      await refresh();
      setNotice({ ok: true, text: `${providerName(providerId)} disconnected.` });
    } catch (err) {
      setNotice({ text: authErrorMessage(err) || "" });
    }
  };

  return (
    <>
      <div className="set-line set-email">
        <span>
          <span className="set-muted">Email</span>
          <strong>{user.email}</strong>
        </span>
        <span className={`set-badge ${user.emailVerified ? "set-badge--ok" : ""}`}>
          {user.emailVerified ? "Verified" : "Not verified"}
        </span>
      </div>

      <h3 className="set-h3">Ways to sign in</h3>
      <ul className="set-methods">
        {[
          ["password", "Email and password", null],
          ["google.com", "Google", "google"],
          ["apple.com", "Apple", "apple"],
        ].map(([id, label, which]) => {
          const on = providers.includes(id);
          return (
            <li key={id}>
              <span>
                <strong>{label}</strong>
                <span className="set-muted">{on ? "Connected" : "Not connected"}</span>
              </span>
              {which ? (
                on ? (
                  <button type="button" className="f-link" onClick={() => disconnect(id)} disabled={providers.length <= 1}>
                    Disconnect
                  </button>
                ) : (
                  <button type="button" className="f-btn f-btn--quiet" onClick={() => connect(which)}>
                    Connect
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      <Notice notice={notice} />

      <PasswordForm hasPassword={hasPassword} onDone={refresh} />
      <PhoneForm phoneNumber={user.phoneNumber} onDone={refresh} />
    </>
  );
}

// ---------------------------------------------------------------------------
function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, busy, danger, confirmDisabled }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="set-overlay" role="presentation" onClick={() => !busy && onCancel()}>
      <div className="set-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title" className="set-h2">
          {title}
        </h2>
        {children}
        <div className="set-dialog-actions">
          <button type="button" className="f-btn f-btn--quiet" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button
            type="button"
            className={`f-btn ${danger ? "f-btn--danger" : "f-btn--primary"}`}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DataSection({ onWiped }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dialog, setDialog] = useState(null); // "wipe" | "delete"
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const hasPassword = user?.providers.includes("password");

  const close = () => {
    setDialog(null);
    setPassword("");
  };

  const wipe = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await wipeAllData();
      const uid = getStoredUser()?.id;
      if (uid != null) clearAllLocalUserData(uid);
      invalidateExerciseCatalog();
      setNotice({ ok: true, text: "All workout data, custom exercises and weigh-ins were removed." });
      close();
      onWiped();
    } catch (err) {
      setNotice({ text: err.message });
    }
    setBusy(false);
  };

  const deleteAccount = async () => {
    setBusy(true);
    setNotice(null);
    try {
      // Confirm it's really them before anything is removed
      await reauthenticate(hasPassword ? { password } : {});
      await deleteAccountData();
      const uid = getStoredUser()?.id;
      if (uid != null) clearAllLocalUserData(uid);
      try {
        await deleteFirebaseUser();
      } catch (_) {
        await signOutEverywhere();
      }
      navigate("/", { replace: true });
    } catch (err) {
      setNotice({ text: authErrorMessage(err) || "Couldn't delete your account." });
      setBusy(false);
      close();
    }
  };

  return (
    <>
      <div className="set-danger">
        <div>
          <h3 className="set-h3">Remove all data</h3>
          <p className="set-muted">Deletes your plan, logged workouts, custom exercises and weight history. Your account stays.</p>
        </div>
        <button type="button" className="f-btn f-btn--danger" onClick={() => setDialog("wipe")}>
          Remove all data
        </button>
      </div>
      <div className="set-danger">
        <div>
          <h3 className="set-h3">Delete account</h3>
          <p className="set-muted">Permanently deletes your FITTMM account and everything in it, on the web and Android.</p>
        </div>
        <button type="button" className="f-btn f-btn--danger" onClick={() => setDialog("delete")}>
          Delete account
        </button>
      </div>
      <Notice notice={notice} />

      {dialog === "wipe" ? (
        <ConfirmDialog title="Remove all data?" confirmLabel="Remove all data" onConfirm={wipe} onCancel={close} busy={busy} danger>
          <p>This can't be undone. Your plan, workout history, custom exercises and weigh-ins will be deleted.</p>
        </ConfirmDialog>
      ) : null}
      {dialog === "delete" ? (
        <ConfirmDialog
          title="Delete your account?"
          confirmLabel="Delete account"
          onConfirm={deleteAccount}
          onCancel={close}
          busy={busy}
          confirmDisabled={hasPassword && !password}
          danger
        >
          <p>This can't be undone. You'll be signed out and all your data will be deleted.</p>
          {hasPassword ? (
            <div className="f-field">
              <label className="f-label" htmlFor="del-pw">
                Enter your password to confirm
              </label>
              <PasswordInput id="del-pw" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          ) : (
            <p className="set-muted">You'll confirm with {user?.providers.includes("google.com") ? "Google" : "Apple"} first.</p>
          )}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
function Settings() {
  const { refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [profileKey, setProfileKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadProfile = useCallback(
    () =>
      getProfile()
        .then((p) => {
          setProfile(p);
          setLoadError("");
        })
        .catch((err) => setLoadError(err.message)),
    []
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async (changes, setError) => {
    setBusy(true);
    setNotice(null);
    try {
      const p = await updateProfile(changes);
      setProfile(p);
      setProfileKey((k) => k + 1);
      setNotice({ ok: true, text: "Profile saved." });
      refresh();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const unit = profile?.unit_system || "imperial";

  return (
    <div className="page">
      <TopNav />
      <main className="set">
        <nav className="set-toc" aria-label="Settings sections">
          <h1 className="f-display set-title">Settings</h1>
          <ul>
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="set-body">
          {loadError ? (
            <p className="f-alert" role="alert">
              {loadError}
            </p>
          ) : null}

          <section id="profile" className="set-section" aria-labelledby="h-profile">
            <h2 id="h-profile" className="set-h2">
              Profile
            </h2>
            {profile ? (
              <>
                <dl className="set-figures">
                  <div>
                    <dt>Age</dt>
                    <dd className="f-num">{profile.age ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Height</dt>
                    <dd className="f-num">{formatHeight(profile.height, unit)}</dd>
                  </div>
                  <div>
                    <dt>BMI</dt>
                    <dd className="f-num">{profile.bmi ?? "—"}</dd>
                    {profile.bmi_category ? <dd className="set-figure-note">{profile.bmi_category}</dd> : null}
                  </div>
                </dl>
                <p className="set-muted set-bmi-note">
                  BMI is weight relative to height. It doesn't account for muscle, so lifters often read high.
                </p>
                <Notice notice={notice} />
                <ProfileForm key={profileKey} profile={profile} onSubmit={saveProfile} busy={busy} />
              </>
            ) : !loadError ? (
              <p role="status">Loading…</p>
            ) : null}
          </section>

          <section id="weight" className="set-section" aria-labelledby="h-weight">
            <h2 id="h-weight" className="set-h2">
              Body weight
            </h2>
            {profile ? (
              <WeightSection
                profile={profile}
                onChanged={() => {
                  loadProfile();
                  setProfileKey((k) => k + 1);
                }}
              />
            ) : null}
          </section>

          <section id="security" className="set-section" aria-labelledby="h-security">
            <h2 id="h-security" className="set-h2">
              Sign-in and security
            </h2>
            <SecuritySection />
          </section>

          <section id="appearance" className="set-section" aria-labelledby="h-appearance">
            <h2 id="h-appearance" className="set-h2">
              Appearance
            </h2>
            <div className="vol-range" role="radiogroup" aria-label="Theme">
              {[
                ["light", "Light"],
                ["dark", "Dark"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  className="vol-range-btn"
                  onClick={() => setTheme(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section id="data" className="set-section" aria-labelledby="h-data">
            <h2 id="h-data" className="set-h2">
              Your data
            </h2>
            <DataSection
              onWiped={() => {
                loadProfile();
                setProfileKey((k) => k + 1);
              }}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default Settings;
