// Read-only database viewer for developers. NOT part of the website.
//
//   npm run db:view      then open http://127.0.0.1:4100
//
// Lists the tables of the MySQL database in server/.env and shows their rows.
// It only runs SELECTs on tables found in information_schema, never accepts
// SQL from the browser, hides password hashes, and listens on localhost only.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../../server/config.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = readFileSync(join(HERE, "index.html"), "utf8");
const PORT = Number(process.env.DB_VIEW_PORT) || 4100;
const HOST = "127.0.0.1";
const HIDDEN = /password|token/i;
const PAGE_SIZE = 50;

const pool = mysql.createPool({ ...config.db, dateStrings: true, connectionLimit: 3 });

const getTables = async () => {
  const [rows] = await pool.query(
    `SELECT table_name AS name
     FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [config.db.database]
  );
  const tables = [];
  for (const { name } of rows) {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM ??", [name]);
    tables.push({ name, rows: n });
  }
  return tables;
};

const getTable = async (name, page) => {
  const [cols] = await pool.query(
    `SELECT column_name AS name, column_type AS type, column_key AS \`key\`
     FROM information_schema.columns WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [config.db.database, name]
  );
  if (!cols.length) return null;

  const shown = cols.filter((c) => !HIDDEN.test(c.name));
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM ??", [name]);
  const [rows] = await pool.query("SELECT ?? FROM ?? LIMIT ? OFFSET ?", [
    shown.map((c) => c.name),
    name,
    PAGE_SIZE,
    page * PAGE_SIZE,
  ]);

  return { columns: shown, hidden: cols.length - shown.length, total, page, pageSize: PAGE_SIZE, rows };
};

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}`);

    if (req.method !== "GET") return send(res, 405, { error: "Read only." });
    if (url.pathname === "/") return send(res, 200, PAGE, "text/html");
    if (url.pathname === "/api/tables") return send(res, 200, { database: config.db.database, tables: await getTables() });

    const match = url.pathname.match(/^\/api\/tables\/([\w$]+)$/);
    if (match) {
      const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
      const data = await getTable(match[1], page);
      return data ? send(res, 200, data) : send(res, 404, { error: "No such table." });
    }

    send(res, 404, { error: "Not found." });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
}).listen(PORT, HOST, () => console.log(`Database viewer: http://${HOST}:${PORT}  (database "${config.db.database}", read only)`));
