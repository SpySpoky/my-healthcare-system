// Starts the development MySQL unless something is already listening on the
// database port. Used by `npm run dev:all`; stays alive either way so the
// other processes keep running.

import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const inUse = await new Promise((resolve) => {
  const socket = net.connect({ port: config.db.port, host: "127.0.0.1" });
  socket.once("connect", () => (socket.destroy(), resolve(true)));
  socket.once("error", () => resolve(false));
});

if (inUse) {
  console.log(`MySQL is already running on port ${config.db.port}.`);
  setInterval(() => {}, 1 << 30);
} else {
  const script = fileURLToPath(new URL("./dev-mysql.js", import.meta.url));
  const child = spawn(process.execPath, [script], { stdio: "inherit" });

  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill());
  process.on("SIGTERM", () => child.kill());
}
