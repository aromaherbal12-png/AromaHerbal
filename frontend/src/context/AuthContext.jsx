import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { setToken } from "../services/api.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "aroma-auth-user";

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * AuthProvider
 *
 * Wraps the app and provides:
 *   - `user`       Current user object { _id, name, email, role } or null
 *   - `token`      JWT string or null
 *   - `loading`    True while the initial stored session is being restored
 *   - `authError`  Last login error message string or null
 *   - `login(email, password)` → calls POST /api/auth/login
 *   - `register({ name, email, password, role })` → calls POST /api/auth/register
 *   - `logout()`   → clears token + user
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore session from localStorage on first mount.
  useEffect(() => {
    const storedUser  = loadStoredUser();
    const storedToken = localStorage.getItem("aroma-token");

    if (storedUser && storedToken) {
      setUser(storedUser);
      setTokenState(storedToken);
      setToken(storedToken); // sync into api.js token store
    }

    setLoading(false);
  }, []);

  // Listen for 401 events fired by api.js when any request is rejected.
  useEffect(() => {
    const handle = () => logout();
    window.addEventListener("aroma:unauthorized", handle);
    return () => window.removeEventListener("aroma:unauthorized", handle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    setAuthError(null);

    try {
      const result = await api.post("/auth/login", { email, password });
      // Backend returns { token, user }
      const { token: jwt, user: backendUser } = result;

      setToken(jwt);
      setTokenState(jwt);
      setUser(backendUser);
      saveStoredUser(backendUser);

      return backendUser;
    } catch (err) {
      const message = err?.data?.message ?? err?.message ?? "Login failed. Please try again.";
      setAuthError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async ({ name, email, password, role }) => {
    setAuthError(null);

    try {
      // POST /api/auth/register — does NOT return a token; user must log in after.
      await api.post("/auth/register", { name, email, password, role });
    } catch (err) {
      const message = err?.data?.message ?? err?.message ?? "Registration failed. Please try again.";
      setAuthError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    saveStoredUser(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, authError, setAuthError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — must be used inside AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
