import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getFirebase } from "./firebase";
import { API_BASE_URL } from "../apiConfig";
import { applyUserSession, clearUserSession } from "../utils/fittmmStorage";

/**
 * Firebase keeps the user signed in (local or session persistence, chosen at
 * sign-in). Every time Firebase issues or refreshes the ID token, it's stored
 * as localStorage "token", which all API calls already send as Bearer.
 */
const AuthContext = createContext({
  ready: true,
  user: null,
  me: null,
  configError: null,
  refresh: async () => {},
});

function snapshot(user) {
  if (!user) return null;
  const providers = user.providerData.map((p) => p.providerId);
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    providers,
    lastSignInTime: user.metadata?.lastSignInTime,
  };
}

export function needsEmailVerification(user) {
  return Boolean(user && user.email && !user.emailVerified &&
    user.providers.includes("password"));
}

async function loadMe(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const me = await res.json();
    applyUserSession(me);
    return me;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ready: false, user: null, me: null, configError: null });

  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    getFirebase()
      .then(({ auth, fb }) => {
        if (cancelled) return;
        unsubscribe = fb.onIdTokenChanged(auth, async (fbUser) => {
          if (!fbUser) {
            localStorage.removeItem("token");
            clearUserSession();
            if (!cancelled) setState({ ready: true, user: null, me: null, configError: null });
            return;
          }
          const { token, claims } = await fbUser.getIdTokenResult();
          // A token minted before the email was verified still says unverified
          if (fbUser.emailVerified && claims.email_verified === false) {
            await fbUser.getIdToken(true);
            return; // the forced refresh fires this listener again
          }
          localStorage.setItem("token", token);
          const user = snapshot(fbUser);
          const me = needsEmailVerification(user) ? null : await loadMe(token);
          if (!cancelled) setState({ ready: true, user, me, configError: null });
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ ready: true, user: null, me: null, configError: err.message });
        }
      });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /** Re-read the Firebase user (after linking a phone, verifying email, etc.). */
  const refresh = useCallback(async () => {
    const { auth } = await getFirebase();
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    await fbUser.reload();
    // Force a new token so claims like email_verified match the reloaded user
    const token = await fbUser.getIdToken(true);
    localStorage.setItem("token", token);
    const user = snapshot(fbUser);
    const me = needsEmailVerification(user) ? null : await loadMe(token);
    setState((s) => ({ ...s, user, me }));
  }, []);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthSplash() {
  return (
    <div className="auth-splash" role="status">
      <span className="f-display auth-splash-mark">FITTMM</span>
      <span className="f-visually-hidden">Loading your account</span>
    </div>
  );
}

/** Guards signed-in pages. Unverified email accounts go to /verify-email. */
export function RequireAuth({ children }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <AuthSplash />;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (needsEmailVerification(user)) return <Navigate to="/verify-email" replace />;
  return children;
}
