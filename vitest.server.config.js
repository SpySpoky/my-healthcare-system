import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// API tests run against a throwaway MySQL database (healthcare_test),
// which the test setup drops and recreates, so the real data is never touched.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["server/test/**/*.test.{js,jsx}"],
    globalSetup: ["./server/test/global-setup.js"],
    setupFiles: ["./server/test/setup.js"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
    css: false,
    env: {
      DB_NAME: "healthcare_test",
      JWT_SECRET: "test-secret-not-for-production",
      LOGIN_RATE_LIMIT: "1000",
    },
  },
});
