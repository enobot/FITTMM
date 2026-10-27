import { getProfile, updateProfile } from "../api/accountApi";
import { getFirebase } from "./firebase";

const PENDING_KEY = "fittmm_pending_profile";

/** Sign-up details kept until the email is verified and the API accepts them. */
export function savePendingProfile(profile) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(profile));
  } catch (_) {}
}

export function readPendingProfile(email) {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    if (p && (!email || String(p.email).toLowerCase() === String(email).toLowerCase())) return p;
  } catch (_) {}
  return null;
}

export function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch (_) {}
}

/** Saves any pending sign-up details to the profile. Returns the profile. */
export async function flushPendingProfile(email) {
  const pending = readPendingProfile(email);
  if (!pending) return getProfile();
  const { email: _ignored, ...changes } = pending;
  const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== "" && v != null));
  const profile = await updateProfile(clean);
  clearPendingProfile();
  return profile;
}

/** Where to go after any successful sign-in. */
export async function destinationAfterSignIn(from) {
  const { auth } = await getFirebase();
  const user = auth.currentUser;
  if (!user) return "/";
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes("password") && !user.emailVerified) return "/verify-email";
  localStorage.setItem("token", await user.getIdToken());
  try {
    const profile = await flushPendingProfile(user.email);
    if (!profile.profile_complete) return "/welcome";
  } catch (_) {
    // The profile can be finished later from Settings
  }
  return from && from !== "/" ? from : "/homepage";
}
