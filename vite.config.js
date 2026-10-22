import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In development the API runs on port 4000; proxying keeps the browser
// on a single origin (no CORS setup needed).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
