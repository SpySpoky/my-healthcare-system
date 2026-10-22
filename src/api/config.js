// The app talks to the Express/MySQL backend unless it runs under the
// test runner or outside Vite (e.g. the seed export script), which use
// demo data registered by src/test/fixtures/demoData.js, or
// VITE_USE_API=false.

// import.meta.env only exists inside Vite/Vitest.
const env = import.meta.env ?? { MODE: "test" };

export const USE_API =
  env.VITE_USE_API === "true" ||
  (env.MODE !== "test" && env.VITE_USE_API !== "false");

// In development Vite proxies /api to the backend (see vite.config.js).
export const API_URL = (env.VITE_API_URL || "/api").replace(/\/$/, "");
