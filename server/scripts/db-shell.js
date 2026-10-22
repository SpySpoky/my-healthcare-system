// Opens the MySQL prompt on the project database:  npm run db:shell

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "../config.js";

const WINDOWS_DEFAULT = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe";
const mysql = process.env.MYSQL_PATH || (existsSync(WINDOWS_DEFAULT) ? WINDOWS_DEFAULT : "mysql");
const { host, port, user, password, database } = config.db;

const args = ["--no-defaults", `-h${host}`, `-P${port}`, `-u${user}`, ...(password ? [`-p${password}`] : []), database];
const result = spawnSync(mysql, args, { stdio: "inherit" });

if (result.error) console.error(`Could not run ${mysql}: ${result.error.message}. Set MYSQL_PATH to mysql.exe.`);
process.exit(result.status ?? 1);
