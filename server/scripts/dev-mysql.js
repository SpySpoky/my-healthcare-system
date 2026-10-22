// Runs a private MySQL server for development, without a Windows
// service or admin rights. It only listens on 127.0.0.1 and the root
// account has no password, which matches server/.env.example.
//
//   npm run db:start      (leave it running; stop with Ctrl+C)
//
// The data lives in ~/healthcare-mysql, outside the project: MySQL 8.4
// fails to start from folders whose path contains spaces. Set
// MYSQL_DATA_DIR to use another folder and MYSQLD_PATH if mysqld is not
// in the default install folder. Skip this script if you already run
// your own MySQL server.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { config } from "../config.js";

const WINDOWS_DEFAULT = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe";
const mysqld = process.env.MYSQLD_PATH || (existsSync(WINDOWS_DEFAULT) ? WINDOWS_DEFAULT : "mysqld");
const dataDir = process.env.MYSQL_DATA_DIR || join(homedir(), "healthcare-mysql");

if (dataDir.includes(" ")) {
  console.error(`The data folder "${dataDir}" contains a space, which MySQL 8.4 cannot start from.`);
  console.error("Set MYSQL_DATA_DIR to a folder without spaces.");
  process.exit(1);
}

const common = ["--no-defaults", `--datadir=${dataDir}`, "--console"];

if (!existsSync(join(dataDir, "mysql"))) {
  console.log(`Creating the development database in ${dataDir} (first run only)...`);

  const init = spawnSync(mysqld, [...common, "--initialize-insecure"], { stdio: "inherit" });

  if (init.error || init.status !== 0) {
    console.error("Could not initialise MySQL. Is it installed? Set MYSQLD_PATH to mysqld if it is elsewhere.");
    process.exit(1);
  }
}

console.log(`Starting MySQL on 127.0.0.1:${config.db.port} ...`);

const server = spawn(
  mysqld,
  [...common, `--port=${config.db.port}`, "--bind-address=127.0.0.1", "--mysqlx=OFF"],
  { stdio: "inherit" }
);

server.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => server.kill());
process.on("SIGTERM", () => server.kill());
