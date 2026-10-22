import { t } from "../i18n";
import { useEffect, useReducer, useRef, useState } from "react";
import Button from "../components/forms/Button";
import { useAuth } from "../context/useAuth";
import { isHydrated } from "./cache";
import { USE_API } from "./config";
import { hydrate } from "./hydrate";

// Holds the app back until the signed-in user's data has been loaded
// from the server (e.g. after a page refresh). A fresh sign-in loads
// the data first, so it does not wait here.
function DataGate({ children }) {
  const { isAuthenticated, logout } = useAuth();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [, refresh] = useReducer((count) => count + 1, 0);

  // The latest logout without re-running the effect when it changes.
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const needsData = USE_API && isAuthenticated && !isHydrated();

  useEffect(() => {
    if (!needsData) {
      return undefined;
    }

    let cancelled = false;

    hydrate()
      .then(() => {
        if (!cancelled) {
          setError("");
          refresh();
        }
      })
      .catch((reason) => {
        if (cancelled) return;

        if (reason.status === 401) {
          logoutRef.current();
        } else {
          setError(reason.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needsData, attempt]);

  if (!needsData) {
    return children;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{t("Could not load your data")}</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => setAttempt((value) => value + 1)}>{t("Try again")}</Button>
            <Button variant="secondary" onClick={() => logoutRef.current()}>
              {t("Sign out")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500"
    >
      {t("Loading your data…")}
    </div>
  );
}

export default DataGate;
