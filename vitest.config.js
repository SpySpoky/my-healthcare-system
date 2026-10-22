import { defineConfig } from "vitest/config";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test runner configuration (kept separate from vite.config.js so the
// Tailwind build step is skipped during tests).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    pool: "threads",
    setupFiles: ["./src/test/setup.js"],
    // Backend tests (server/test) need MySQL: `npm run test:api`.
    // Turkish checks (src/test/tr) run with their own config: `npm run test:tr`.
    include: ["src/**/*.test.{js,jsx}"],
    exclude: [...configDefaults.exclude, "src/test/tr/**"],
    css: false,
    testTimeout: 20000,
    reporters: ["default"],
  },
});
