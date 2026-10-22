import { useCallback, useEffect, useState } from "react";
import { USE_API } from "../api/config";
import { UNAUTHORIZED_EVENT, clearToken, setToken } from "../api/client";
import { clearData } from "../api/hydrate";
import AuthContext from "./authContextValue";

const STORAGE_KEY = "healthcare_user";

// "Remember me" keeps the session in localStorage; otherwise it
// lives in sessionStorage and ends when the browser is closed.
function getStoredUser() {
  try {
    const storedUser =
      localStorage.getItem(STORAGE_KEY) ||
      sessionStorage.getItem(STORAGE_KEY);

    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Failed to load stored user:", error);
    return null;
  }
}

function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  // With the backend, `token` is the server's login token.
  const login = (userData, { remember = true, token } = {}) => {
    if (token) {
      setToken(token, { remember });
    }

    setUser(userData);
    clearStoredUser();

    try {
      (remember ? localStorage : sessionStorage).setItem(
        STORAGE_KEY,
        JSON.stringify(userData)
      );
    } catch {
      // The session still works for this page load.
    }
  };

  // Updates the signed-in user's details (e.g. after a profile edit)
  // in whichever storage holds the session.
  const updateUser = (changes) => {
    setUser((previous) => {
      const next = { ...previous, ...changes };

      try {
        const storage = localStorage.getItem(STORAGE_KEY)
          ? localStorage
          : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Session continues in memory.
      }

      return next;
    });
  };

  const logout = useCallback(() => {
    setUser(null);
    clearStoredUser();

    if (USE_API) {
      clearToken();
      clearData();
    }
  }, []);

  // The server rejected our token (expired or account disabled).
  useEffect(() => {
    if (!USE_API) {
      return undefined;
    }

    window.addEventListener(UNAUTHORIZED_EVENT, logout);

    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const getDashboardPath = (role) => {
    switch (role) {
      case "patient":
        return "/patient/dashboard";

      case "doctor":
        return "/doctor/dashboard";

      case "medical_staff":
        return "/doctor/dashboard";

      case "admin":
        return "/admin/dashboard";

      default:
        return "/login";
    }
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        updateUser,
        getDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
