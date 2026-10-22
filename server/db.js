import mysql from "mysql2/promise";
import { config } from "./config.js";

// DATE / DATETIME columns come back as strings ("2026-10-16",
// "2026-10-16 09:30:00") so no time zone conversion happens in Node.
// Every connection works in UTC.
export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  charset: "utf8mb4",
  timezone: "Z",
});

pool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

const clean = (params) => params.map((value) => (value === undefined ? null : value));

// Runs a query and returns its rows (or the result header for writes).
export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, clean(params));
  return rows;
};

export const queryOne = async (sql, params = []) => (await query(sql, params))[0] || null;

// Runs `work(tx)` in a transaction; `tx.query` mirrors `query`.
export const withTransaction = async (work) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const tx = {
      query: async (sql, params = []) => (await connection.query(sql, clean(params)))[0],
    };
    const result = await work(tx);

    await connection.commit();

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
