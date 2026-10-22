import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// server/.env (real environment variables take priority over it).
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env"), quiet: true });

const isProduction = process.env.NODE_ENV === "production";

let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  if (isProduction) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  // Development only: sessions end whenever the server restarts.
  jwtSecret = randomBytes(32).toString("hex");
  console.warn("JWT_SECRET is not set; using a temporary secret for this run.");
}

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  // Cloudflare Turnstile secret key; when empty the captcha is not checked server side.
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 30,
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "healthcare",
  },
};
