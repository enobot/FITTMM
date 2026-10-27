import { API_BASE_URL } from "../apiConfig";
import { fetchWithTimeout } from "./workoutApi";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function detailMessage(data, fallback) {
  if (!data || data.detail == null) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((x) => (x && typeof x.msg === "string" ? x.msg.replace(/^Value error, /, "") : ""))
      .filter(Boolean)
      .join(" ");
  }
  return fallback;
}

/** JSON request with the signed-in user's token. */
export async function apiRequest(path, { method = "GET", body, timeoutMs } = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
      timeoutMs
    );
  } catch (err) {
    throw new ApiError(err?.message || "Can't reach the FITTMM server. Check your connection.", 0);
  }
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_) {}
  if (!res.ok) {
    throw new ApiError(detailMessage(data, `Request failed (${res.status}).`), res.status);
  }
  return data;
}

export const getProfile = () => apiRequest("/profile");
export const updateProfile = (changes) => apiRequest("/profile", { method: "PATCH", body: changes });
export const listWeights = () => apiRequest("/profile/weights");
export const addWeight = (weight, recordedOn) =>
  apiRequest("/profile/weights", {
    method: "POST",
    body: recordedOn ? { weight, recorded_on: recordedOn } : { weight },
  });
export const deleteWeight = (id) => apiRequest(`/profile/weights/${id}`, { method: "DELETE" });

export const getExercise = (id) => apiRequest(`/workout/exercises/${id}`);
export const getExerciseVideos = (id) => apiRequest(`/workout/exercises/${id}/videos`);
export const searchVideos = (q) => apiRequest(`/workout/videos?q=${encodeURIComponent(q)}`);

export function localDateString(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const getVolume = (days = 30) =>
  apiRequest(
    `/workout/volume?days=${days}&today=${localDateString()}&tz_offset=${new Date().getTimezoneOffset()}`
  );

export const wipeAllData = () => apiRequest("/auth/me/data", { method: "DELETE" });
export const deleteAccountData = () => apiRequest("/auth/me", { method: "DELETE" });
