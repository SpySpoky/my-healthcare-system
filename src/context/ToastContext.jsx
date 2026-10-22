import { useCallback, useEffect, useRef, useState } from "react";
import { SYNC_ERROR_EVENT } from "../api/client";
import ToastContext from "./toastContextValue";

import { t } from "../i18n";
const TOAST_DURATION = 3500;

const variantStyles = {
  success: {
    container: "border-emerald-200 bg-white",
    icon: "bg-emerald-100 text-emerald-700",
    symbol: "✓",
  },
  error: {
    container: "border-red-200 bg-white",
    icon: "bg-red-100 text-red-700",
    symbol: "!",
  },
  warning: {
    container: "border-amber-200 bg-white",
    icon: "bg-amber-100 text-amber-700",
    symbol: "!",
  },
  info: {
    container: "border-cyan-200 bg-white",
    icon: "bg-cyan-100 text-cyan-700",
    symbol: "i",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id) => {
    setToasts((previous) =>
      previous.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (message, variant = "success") => {
      const id = nextId.current++;

      setToasts((previous) => [
        ...previous,
        { id, message, variant },
      ]);

      setTimeout(() => dismissToast(id), TOAST_DURATION);
    },
    [dismissToast]
  );

  // A change could not be saved on the server.
  useEffect(() => {
    const onSyncError = (event) =>
      showToast(
        t("{problem} The latest saved data was reloaded.", {
          problem: event.detail?.message || t("A change could not be saved."),
        }),
        "error"
      );

    window.addEventListener(SYNC_ERROR_EVENT, onSyncError);

    return () => window.removeEventListener(SYNC_ERROR_EVENT, onSyncError);
  }, [showToast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => {
          const styles =
            variantStyles[toast.variant] || variantStyles.info;

          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl shadow-slate-900/10 animate-slide-up ${styles.container}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${styles.icon}`}
              >
                {styles.symbol}
              </span>

              <p className="flex-1 pt-0.5 text-sm font-semibold text-slate-700">
                {toast.message}
              </p>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label={t("Dismiss notification")}
                className="text-lg leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
