const USER_KEY = "fittmm_user";

/** Legacy global keys (pre–per-user scoping), cleared when binding this browser to an account */
const LEGACY_KEYS = [
  "fittmm_plan_day_selections",
  "fittmm_workout_logs",
  "fittmm_workout_day_logs",
  "fittmm_plans",
  "fittmm_selected_day",
];

function scopedKey(userId, shortKey) {
  return `fittmm:${userId}:${shortKey}`;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u && typeof u.id === "number") return u;
    return null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAllKeysForUser(userId) {
  if (userId == null) return;
  const prefix = `fittmm:${userId}:`;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      localStorage.removeItem(k);
    }
  }
}

function clearLegacyUnscopedKeys() {
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
}

/**
 * After a successful /auth/me, attach this user to the session.
 * Clears global legacy keys when first binding this browser or switching accounts.
 */
export function applyUserSession(user) {
  const prev = getStoredUser();
  if (prev && prev.id !== user.id) {
    clearLegacyUnscopedKeys();
    clearAllKeysForUser(prev.id);
  } else if (!prev) {
    clearLegacyUnscopedKeys();
  }
  setStoredUser(user);
}

export function clearUserSession() {
  localStorage.removeItem(USER_KEY);
}

/** Clears legacy keys and all `fittmm:<userId>:*` entries for this browser (after server wipes DB data). */
export function clearAllLocalUserData(userId) {
  clearLegacyUnscopedKeys();
  clearAllKeysForUser(userId);
}

/**
 * @param {string} shortKey — e.g. "plan_day_selections"
 */
export function getScopedItem(shortKey) {
  const u = getStoredUser();
  if (!u) return null;
  return localStorage.getItem(scopedKey(u.id, shortKey));
}

/**
 * @param {string} shortKey
 * @param {string} value
 */
export function setScopedItem(shortKey, value) {
  const u = getStoredUser();
  if (!u) return;
  localStorage.setItem(scopedKey(u.id, shortKey), value);
}

export function removeScopedItem(shortKey) {
  const u = getStoredUser();
  if (!u) return;
  localStorage.removeItem(scopedKey(u.id, shortKey));
}

export const K = {
  PLAN_DAY_SELECTIONS: "plan_day_selections",
  WORKOUT_LOGS: "workout_logs",
  WORKOUT_DAY_LOGS: "workout_day_logs",
  PLANS: "plans",
  SELECTED_DAY: "selected_day",
};
