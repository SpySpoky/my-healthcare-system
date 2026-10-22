import { useEffect, useRef, useState } from "react";

import { t } from "../../i18n";
// Set VITE_GOOGLE_CLIENT_ID in .env (Google Cloud Console ->
// OAuth client ID, with http://localhost:5173 as an authorised origin).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise;

const loadScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();

  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return scriptPromise;
};

// Reads the email from Google's ID token. The signature must be
// checked server side once a backend exists.
const decodeEmail = (credential) => {
  try {
    const payload = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).email || "";
  } catch {
    return "";
  }
};

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

// "Continue with Google" using Google Identity Services.
// Calls onEmail(email) with the Google account's email address.
// With a backend, pass onCredential instead: it receives the signed ID
// token, which the server verifies (the email alone proves nothing).
function GoogleSignInButton({ onEmail, onCredential, onError, disabled }) {
  const buttonRef = useRef(null);
  const handlersRef = useRef({ onEmail, onError });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlersRef.current = { onEmail, onCredential, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => {
            if (handlersRef.current.onCredential) {
              handlersRef.current.onCredential(credential);
              return;
            }

            const email = decodeEmail(credential);
            if (email) handlersRef.current.onEmail(email);
            else handlersRef.current.onError(t("Google sign-in failed."));
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "en",
          width: buttonRef.current.offsetWidth || 320,
        });

        setReady(true);
      })
      .catch(() => handlersRef.current.onError(t("Could not load Google sign-in.")));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onError(
            "Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to your .env file."
          )
        }
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
      >
        <GoogleIcon />{t("Continue with Google")}</button>
    );
  }

  return (
    <div
      ref={buttonRef}
      aria-busy={!ready}
      className={`flex min-h-[44px] w-full justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
    />
  );
}

export default GoogleSignInButton;
