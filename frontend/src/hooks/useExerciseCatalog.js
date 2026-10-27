import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchExerciseCatalog } from "../api/workoutApi";
import { getStoredUser } from "../utils/fittmmStorage";

// One download per user per page load, shared by every screen that needs photos.
let cache = { userKey: null, promise: null };

function load(force = false) {
  const userKey = getStoredUser()?.id ?? localStorage.getItem("token")?.slice(-12) ?? "anon";
  if (force || !cache.promise || cache.userKey !== userKey) {
    cache = { userKey, promise: fetchExerciseCatalog() };
    cache.promise.catch(() => {
      cache = { userKey: null, promise: null };
    });
  }
  return cache.promise;
}

export function invalidateExerciseCatalog() {
  cache = { userKey: null, promise: null };
}

export const nameKey = (name) => String(name || "").trim().toLowerCase();

// The plan builder's original quick picks use everyday names; borrow the
// matching library entry's photo for them.
const PHOTO_ALIASES = {
  squats: "barbell squat",
  deadlifts: "barbell deadlift",
  "hip thrusts": "barbell hip thrust",
  "front squat": "front barbell squat",
  "glute bridges": "barbell glute bridge",
  "split squats": "split squat with dumbbells",
  bulgarians: "split squat with dumbbells",
};

/** The exercise library plus the user's custom exercises, and a lookup by name. */
export function useExerciseCatalog() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const list = await load(force);
      setExercises(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e) {
      setError(e.message || "Could not load exercises");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const byName = useMemo(() => {
    const map = new Map();
    // Prefer the user's own exercise, then the library entry
    exercises.forEach((ex) => {
      const key = nameKey(ex.name);
      if (!map.has(key) || ex.userid != null) map.set(key, ex);
    });
    Object.entries(PHOTO_ALIASES).forEach(([alias, target]) => {
      const own = map.get(alias);
      const lib = map.get(target);
      if (lib && (!own || !own.image)) map.set(alias, { ...(own || lib), image: lib.image, images: lib.images });
    });
    return map;
  }, [exercises]);

  return { exercises, byName, loading, error, reload };
}
