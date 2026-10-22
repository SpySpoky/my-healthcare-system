import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Renders the pages in Turkish and looks for text that was not translated.
// Run with: npm run test:tr
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    pool: "threads",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/test/tr/**/*.test.{js,jsx}"],
    css: false,
    testTimeout: 60000,
    env: { VITE_FORCE_LANGUAGE: "tr" },
  },
});
