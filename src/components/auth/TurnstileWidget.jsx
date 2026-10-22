import { useEffect, useRef } from "react";

// Cloudflare's public test site key always passes. Set
// VITE_TURNSTILE_SITE_KEY in .env to use a real key.
const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// The desktop app (electron/main.js) runs its own API, which has no
// Turnstile secret and so never checks the token. Cloudflare also
// rejects the app's 127.0.0.1 address and often Electron itself, so
// the check is skipped there.
const IS_DESKTOP_APP =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Electron/");

let scriptPromise;

const loadScript = () => {
  if (window.turnstile) return Promise.resolve();

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

// Cloudflare Turnstile human check. Calls onVerify(token) when
// passed and onVerify("") when the token expires or errors.
// Note: the token must also be verified server side once a backend exists.
function TurnstileWidget({ onVerify }) {
  const containerRef = useRef(null);
  const onVerifyRef = useRef(onVerify);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  });

  useEffect(() => {
    // Unit tests (jsdom) cannot run the Cloudflare widget.
    if (import.meta.env.MODE === "test") {
      onVerifyRef.current("test-token");
      return;
    }

    if (IS_DESKTOP_APP) {
      onVerifyRef.current("desktop-app");
      return;
    }

    let widgetId;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          size: "flexible",
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => onVerifyRef.current(""),
          "error-callback": () => onVerifyRef.current(""),
        });
      })
      .catch(() => onVerifyRef.current(""));

    return () => {
      cancelled = true;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, []);

  if (IS_DESKTOP_APP) return null;

  return <div ref={containerRef} className="min-h-[65px] w-full" />;
}

export default TurnstileWidget;
