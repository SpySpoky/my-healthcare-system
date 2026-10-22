// Desktop app: runs the Express API inside Electron, serves the built
// website from the same local address, and shows it in a window.
//
//   npm run electron:dev     build the website, then open the app
//   npm run electron:build   Windows installer in release/
//
// The MySQL connection comes from settings.json in the app's data folder
// (%APPDATA%\Healthcare Management System on Windows). It is created on
// the first start; every copy of the app points at the same shared
// database, so all users see the same data.

import { BrowserWindow, Menu, app, dialog, shell } from "electron";
import dotenv from "dotenv";
import express from "express";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const DEFAULT_SETTINGS = {
  DB_HOST: "127.0.0.1",
  DB_PORT: "3306",
  DB_USER: "root",
  DB_PASSWORD: "",
  DB_NAME: "healthcare",
};

let server;
let pool;

// Reads settings.json, creating it (with a login-token secret of its own) when missing.
// On a developer's machine the first copy takes the database details from server/.env.
const loadSettings = () => {
  const file = join(app.getPath("userData"), "settings.json");

  if (!existsSync(file)) {
    const envFile = join(ROOT, "server/.env");
    const local = existsSync(envFile) ? dotenv.parse(readFileSync(envFile)) : {};
    const db = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, local[key] ?? DEFAULT_SETTINGS[key]]));

    writeFileSync(file, JSON.stringify({ ...db, JWT_SECRET: randomBytes(48).toString("hex") }, null, 2));
  }

  return { file, settings: JSON.parse(readFileSync(file, "utf8")) };
};

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();

      probe.close(() => resolve(port));
    });
  });

const startServer = async (settings) => {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;

  // The API reads its configuration from the environment when it is first imported.
  // No Turnstile secret: the login page skips the captcha inside the app.
  Object.assign(process.env, settings, { NODE_ENV: "production", CORS_ORIGIN: origin, TURNSTILE_SECRET_KEY: "" });

  const { createApp } = await import(pathToFileURL(join(ROOT, "server/app.js")).href);
  ({ pool } = await import(pathToFileURL(join(ROOT, "server/db.js")).href));

  await pool.query("SELECT 1");

  // The API keeps its own security headers; the website is served beside it.
  const api = createApp();
  const site = express();

  site.use((req, res, next) => (req.path.startsWith("/api") ? api(req, res, next) : next()));
  site.use(express.static(DIST));
  site.use((_req, res) => res.sendFile(join(DIST, "index.html")));

  await new Promise((resolve) => {
    server = site.listen(port, "127.0.0.1", resolve);
  });

  console.log(`Healthcare desktop app serving ${origin}`);

  return origin;
};

const createWindow = (origin) => {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Healthcare Management System",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });

  // Links to other sites open in the normal browser, never inside the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);

    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  window.loadURL(origin);
};

const showDatabaseError = async (error, file) => {
  const { response } = await dialog.showMessageBox({
    type: "error",
    title: "Cannot reach the database",
    message: "The app could not connect to the MySQL database.",
    detail:
      `${error.code || error.message}\n\n` +
      `Check the database settings in:\n${file}\n\n` +
      "Then start the app again.",
    buttons: ["Open settings file", "Quit"],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) await shell.openPath(file);
};

// One copy of the app at a time.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();

    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    if (!existsSync(join(DIST, "index.html"))) {
      dialog.showErrorBox("Website not built", "Run `npm run build` first (npm run electron:dev does this).");
      app.quit();
      return;
    }

    const { file, settings } = loadSettings();

    try {
      createWindow(await startServer(settings));
    } catch (error) {
      await showDatabaseError(error, file);
      app.quit();
    }
  });

  app.on("window-all-closed", () => app.quit());

  app.on("will-quit", () => {
    server?.close();
    pool?.end().catch(() => {});
  });
}
