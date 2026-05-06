import { API_BASE_URL } from "../apiConfig";

export const PLAN_DAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function authHeaders() {
  const token = localStorage.getItem("token");
  const h = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

const DEFAULT_FETCH_MS = 45000;
const MUTATION_FETCH_MS = 25000;
/** Plan PUT can touch DB longer than a quick POST */
const PLAN_SAVE_FETCH_MS = 90000;

/**
 * Race fetch against a hard deadline so the UI never waits forever if abort() is ignored.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_FETCH_MS) {
  const ctrl = new AbortController();
  let timer = null;
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new Error("Request timed out. Check your connection and try again."));
    }, timeoutMs);
  });
  try {
    const res = await Promise.race([
      fetch(url, { ...options, signal: ctrl.signal }),
      timedOut,
    ]);
    if (timer) clearTimeout(timer);
    return res;
  } catch (e) {
    if (timer) clearTimeout(timer);
    if (e?.name === "AbortError") {
      throw new Error("Request timed out. Check your connection and try again.");
    }
    throw e;
  }
}

export function selectionsFromApiPlan(plan) {
  const out = {};
  PLAN_DAY_ORDER.forEach((d) => {
    out[d] = [];
  });
  if (!plan?.workouts) return out;
  for (const wo of plan.workouts) {
    const list = wo.workout_exercises || [];
    for (const we of list) {
      const day = PLAN_DAY_ORDER[we.day_of_week];
      if (!day || !we.name) continue;
      if (!out[day]) out[day] = [];
      out[day].push(we.name);
    }
  }
  return out;
}

async function fetchExerciseList() {
  const res = await fetchWithTimeout(`${API_BASE_URL}/workout/exercises`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load exercises");
  return res.json();
}

export async function fetchExerciseCatalog() {
  return fetchExerciseList();
}

export async function createCustomExercise({ name, body_part }) {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("You need to be logged in to add an exercise.");
  }
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/workout/exercises`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: name.trim(),
        description: "",
        image: "",
        body_part: body_part || null,
      }),
    },
    MUTATION_FETCH_MS
  );
  if (!res.ok) {
    let detail = "Could not add exercise.";
    try {
      const raw = await res.text();
      if (raw) {
        const err = JSON.parse(raw);
        if (typeof err.detail === "string") detail = err.detail;
      }
    } catch (_) {}
    throw new Error(detail);
  }
  try {
    const raw = await res.text();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Returns Map exercise display name -> id (creates missing exercises as needed).
 */
export async function ensureExerciseIds(displayNames) {
  const names = [...new Set((displayNames || []).filter(Boolean))];
  let list = await fetchExerciseList();
  const lower = (s) => String(s).trim().toLowerCase();
  const idByLower = {};
  list.forEach((e) => {
    idByLower[lower(e.name)] = e.id;
  });
  const map = {};
  for (const name of names) {
    const key = lower(name);
    let id = idByLower[key];
    if (id == null) {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/workout/exercises`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            name: String(name).trim(),
            description: "",
            image: "",
          }),
        },
        MUTATION_FETCH_MS
      );
      if (res.status === 400) {
        list = await fetchExerciseList();
        list.forEach((e) => {
          idByLower[lower(e.name)] = e.id;
        });
        id = idByLower[key];
      } else if (!res.ok) {
        throw new Error("Could not create exercise");
      } else {
        const raw = await res.text();
        const created = raw ? JSON.parse(raw) : {};
        id = created.id;
        idByLower[key] = id;
      }
    }
    map[name] = id;
  }
  return map;
}

export async function buildPlanCreatePayload(selections, meta = {}) {
  const names = new Set();
  PLAN_DAY_ORDER.forEach((day) => {
    (selections[day] || []).forEach((n) => names.add(n));
  });
  const idByName = await ensureExerciseIds([...names]);
  const workout_exercises = [];
  PLAN_DAY_ORDER.forEach((day, dayIdx) => {
    (selections[day] || []).forEach((name) => {
      const id = idByName[name];
      if (id != null) {
        workout_exercises.push({ exerciseid: id, day_of_week: dayIdx });
      }
    });
  });

  const planName = (meta.planName || meta.plan_name || "My plan").trim() || "My plan";
  let description = [meta.focus, meta.notes].filter(Boolean).join(" · ");
  if (meta.weeks !== "" && meta.weeks != null) {
    const w = meta.weeks;
    description = `${description}${description ? " · " : ""}${w} week${w === 1 ? "" : "s"}`.trim();
  }

  return {
    name: planName.slice(0, 50),
    description: (description || "").slice(0, 250),
    workouts: [
      {
        name: "Weekly",
        description: "",
        workout_exercises,
      },
    ],
  };
}

export async function fetchPlan() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const res = await fetch(`${API_BASE_URL}/workout/plan`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load workout plan");
  return res.json();
}

export async function savePlan(planBody) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/workout/plan`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(planBody),
    },
    PLAN_SAVE_FETCH_MS
  );
  if (!res.ok) {
    let detail = res.statusText || `Could not save plan (${res.status})`;
    try {
      const raw = await res.text();
      if (raw) {
        const err = JSON.parse(raw);
        if (typeof err.detail === "string") detail = err.detail;
        else if (Array.isArray(err.detail))
          detail = err.detail.map((x) => x.msg || JSON.stringify(x)).join("; ");
      }
    } catch (_) {}
    throw new Error(detail || "Could not save plan");
  }
  try {
    const raw = await res.text();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export async function fetchSessions() {
  const res = await fetch(`${API_BASE_URL}/workout/sessions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load workout history");
  return res.json();
}

export async function postSession(payload) {
  const res = await fetch(`${API_BASE_URL}/workout/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      if (typeof err.detail === "string") detail = err.detail;
    } catch (_) {}
    throw new Error(detail || "Could not save workout");
  }
  return res.json();
}

/** Latest logged workout snapshot for a weekday name (e.g. "Monday"). */
export function latestPayloadForWeekday(sessions, weekdayName) {
  if (!Array.isArray(sessions)) return null;
  const matches = sessions.filter((s) => s.payload?.day === weekdayName);
  matches.sort(
    (a, b) =>
      new Date(b.payload?.date || b.logged_at).getTime() -
      new Date(a.payload?.date || a.logged_at).getTime()
  );
  return matches[0]?.payload || null;
}
