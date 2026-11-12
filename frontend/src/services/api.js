/**
 * api.js
 * Lightweight fetch wrapper for the Aroma Workflow backend.
 *
 * Usage:
 *   import api from "./services/api.js";
 *   const data = await api.get("/inventory/materials");
 *   const result = await api.post("/auth/login", { email, password });
 *
 * Token handling:
 *   - Reads the JWT from localStorage key "aroma-token" on every request.
 *   - On 401 it clears the stored token and dispatches a custom
 *     "aroma:unauthorized" event so AuthContext can redirect to login.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Read the current token (may be null). */
export function getToken() {
  return localStorage.getItem("aroma-token");
}

/** Persist a new token (or clear with null). */
export function setToken(token) {
  if (token) {
    localStorage.setItem("aroma-token", token);
  } else {
    localStorage.removeItem("aroma-token");
  }
}

/** Build request headers, injecting Authorization when a token exists. */
function buildHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Core request function.
 * @param {string} path   - API path e.g. "/auth/login"
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} Parsed JSON body on success.
 * @throws {Error} with `.statusCode` and `.data` attached on API errors.
 */
async function request(path, options = {}) {
  const url = `${BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  // Parse JSON regardless of status so we can attach the body to errors.
  let body;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = { message: await response.text() };
  }

  if (!response.ok) {
    // 401 — token expired or invalid. Clear stored credentials and
    // notify the app so it can redirect to the login screen.
    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent("aroma:unauthorized"));
    }

    const error = new Error(body?.message ?? `HTTP ${response.status}`);
    error.statusCode = response.status;
    error.data = body;
    throw error;
  }

  return body?.data ?? body;
}

const api = {
  get:    (path, options = {}) => request(path, { method: "GET",    ...options }),
  post:   (path, body, options = {}) => request(path, { method: "POST",   body: JSON.stringify(body), ...options }),
  patch:  (path, body, options = {}) => request(path, { method: "PATCH",  body: JSON.stringify(body), ...options }),
  put:    (path, body, options = {}) => request(path, { method: "PUT",    body: JSON.stringify(body), ...options }),
  delete: (path, options = {}) => request(path, { method: "DELETE", ...options }),
};

export default api;
