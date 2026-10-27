import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../auth/AuthLayout";
import ProfileForm from "../components/ProfileForm";
import { getProfile, updateProfile } from "../api/accountApi";
import { flushPendingProfile } from "../auth/afterSignIn";
import { useAuth } from "../auth/AuthContext";

function Welcome() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await flushPendingProfile(user?.email).catch(() => getProfile());
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const save = async (changes, setError) => {
    setBusy(true);
    try {
      await updateProfile(changes);
      await refresh();
      navigate("/homepage", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const firstName = profile?.fname || user?.displayName?.split(" ")[0] || "";

  return (
    <AuthLayout wide>
      <h1>{firstName ? `Welcome, ${firstName}` : "Welcome to FITTMM"}</h1>
      <p className="auth-lede">
        A few numbers let FITTMM show your BMI and track your weight over time. You can change
        them anytime in Settings.
      </p>
      {loadError ? <p className="f-alert">{loadError}</p> : null}
      {profile ? (
        <ProfileForm
          profile={profile}
          onSubmit={save}
          busy={busy}
          submitLabel="Save and continue"
          secondary={
            <button type="button" className="f-btn f-btn--quiet" onClick={() => navigate("/homepage", { replace: true })}>
              Skip for now
            </button>
          }
        />
      ) : !loadError ? (
        <p className="auth-lede" role="status">
          Loading your profile…
        </p>
      ) : null}
    </AuthLayout>
  );
}

export default Welcome;
