import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

const app = createApp();

try {
  await pool.query("SELECT 1");
} catch (error) {
  console.error(`Cannot reach MySQL at ${config.db.host}:${config.db.port} (${error.code || error.message}).`);
  console.error("Start MySQL, check server/.env, then run: npm run db:setup");
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`Healthcare API running at http://localhost:${config.port}/api`);
});

const shutdown = () => {
  server.close(() => pool.end().finally(() => process.exit(0)));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
