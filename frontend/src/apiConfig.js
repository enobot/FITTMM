/**
 * Base URL for API fetches (no trailing slash).
 *
 * - Development: default "" uses Create React App's dev-server proxy (see package.json "proxy")
 *   → browser talks only to :3000; Node forwards /auth, /workout, /api to :8000.
 * - Production: set REACT_APP_API_URL to your API origin (e.g. https://api.example.com).
 */
const trimmedEnvApi = (process.env.REACT_APP_API_URL || "").trim();

export const API_BASE_URL =
  trimmedEnvApi ||
  (process.env.NODE_ENV === "development" ? "" : "http://localhost:8000");
