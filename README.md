# Centralized Healthcare Management System

Three-tier web application:

| Tier | Technology | Where |
|---|---|---|
| Presentation | React 19, Vite, Tailwind CSS, React Router | `src/` |
| Application | Node.js, Express (REST API, JWT auth) | `server/` |
| Data | MySQL 8 | `server/db/schema.sql` |

Four portals share one API: **patient**, **doctor**, **medical staff** and **administrator**.

## Run it

1. **Install** Node.js 20+ and MySQL 8, then `npm install`.
2. **Configure** the backend: copy `server/.env.example` to `server/.env` and set the MySQL
   connection and a `JWT_SECRET`.
3. **Start MySQL.** If you already run MySQL, skip this. Otherwise, on a machine where MySQL is
   installed but not set up as a service, `npm run db:start` runs a private development server
   (data in `~/healthcare-mysql`, localhost only, root without a password). Leave it running.
4. **Create the database** with demo data: `npm run db:setup` (drops and recreates it).
5. **Start the app**: `npm run dev:all` (API on port 4000, website on port 5173; Vite proxies `/api`).

Demo sign-ins, all with password `password123`: `patient@test.com`, `doctor@test.com`,
`staff@test.com`, `admin@test.com`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:all` | API (auto-restart) and website together |
| `npm run server` / `npm run dev` | API only / website only |
| `npm run db:start` | Private development MySQL server (optional) |
| `npm run db:setup` | Create the schema and load demo data. `-- --empty` for the schema only |
| `npm run db:export` | Rebuild `server/db/demo-data.json` from the demo fixtures in `src/test/fixtures/` |
| `npm test` | Front end tests (run on the demo fixtures, no server needed) |
| `npm run test:api` | API tests against a throwaway `healthcare_test` database |
| `npm run build` | Production build of the website into `dist/` |
| `npm run electron:dev` | Build the website and open it as a desktop app |
| `npm run electron:build` | Windows installer in `release/` |

## How the front end talks to the API

The pages read data synchronously from `src/data/*.js`. With the backend, those modules read a
per-user in-memory cache (`src/api/cache.js`) that is loaded from `GET /api/bootstrap` after sign-in
(only the data the signed-in role may see). When a page saves a collection, `src/api/persist.js`
compares it with the previous value and calls the matching REST endpoint (`POST/PATCH/PUT/DELETE`);
if the server rejects a change the user sees a message and the data is reloaded.
The app contains no demo data, no doctor names and no department names: doctors, departments,
schedules and everything else come from the database. The frontend tests run on the demo dataset in
`src/test/fixtures/demoData.js`, which is also the source of `server/db/demo-data.json` (the database
seed, regenerated with `npm run db:export`).

## Languages (English and Turkish)

The EN | TR toggle in the header and on the sign-in pages switches the whole website. The choice is
saved in the browser and the page reloads in the new language (dates, times, numbers, validation
messages, error messages from the API and the activity log are all translated; appointment times
become a 24-hour clock in Turkish).

How it works (`src/i18n/`): the English text is the key. Every visible string is written `t("English text")`
and the Turkish dictionary (`src/i18n/tr/part*.js`) maps it to Turkish; anything without a Turkish entry
simply shows in English. Placeholders look like `t("Welcome, {name}", { name })`. Values that come from
the database (statuses, departments, days) are translated at display time through the same dictionary,
while the stored values stay English. User-written content (feedback, notes, messages) is never translated.

| Command | What it does |
|---|---|
| `npm run i18n:check` | Lists every `t()` string without a Turkish translation (exit code 1 if any) |
| `npm run test:tr` | Opens every page in Turkish and fails on text that looks untranslated |
| `node tools/i18n/suspects.mjs` | Lists sentence-like strings that are not wrapped in `t()` yet |

To add text: wrap it in `t("...")`, run `npm run i18n:check`, and add the Turkish to a `src/i18n/tr/part*.js` file.
To add a language: add it to `LANGUAGES` in `src/i18n/index.js`, create its dictionary and register it in `dictionaries`.
(`tools/i18n/wrap.mjs` is the one-off script that first wrapped the existing text; it does not need to be run again.)

## API overview (`/api`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `/auth/google`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` |
| Data | `GET /bootstrap` (role-scoped), `GET /health` |
| Appointments | `POST /appointments`, `PATCH /appointments/:id` |
| Patients | `PATCH /patients/:id`, `GET /patients/:id/record`, `POST /patients/:id/record/:section` (doctors; `vitals` also medical staff) |
| Patient documents | `POST /patients/:id/documents` (`multipart/form-data`), `GET /patients/:id/documents/:documentId` (downloads it), `DELETE /patients/:id/documents/:documentId` |
| Doctors | `PUT /doctors/:slug/availability` |
| Feedback | `GET/POST /feedback`, `PATCH/DELETE /feedback/:id` |
| Applications | `POST /applications` (public, `multipart/form-data` with the documents), `GET /applications`, `GET /applications/:id/documents/:no` (admin; downloads one file), `PATCH /applications/:id` (admin; approval creates the account) |
| Messages | `GET /messages`, `POST /messages`, `GET /messages/contacts`, `GET /messages/unread-count`, `PATCH /messages/:id/read`, `DELETE /messages/:id` (patients, doctors, medical staff) |
| Users / activity | `GET/POST/PATCH/DELETE /users` (admin), `GET/POST /activity` |

Security notes: passwords are bcrypt hashes; sessions are signed JWTs checked against the database
on every request (a suspended account is locked out at once); every route checks the caller's role
and ownership; SQL is parameterised; login routes are rate limited; Turnstile and Google tokens are
verified server side when `TURNSTILE_SECRET_KEY` / `GOOGLE_CLIENT_ID` are set.

## Database

`server/db/schema.sql` implements the ER diagram of the ITEC403 report (users specialised into
patient / staff / admin, staff into doctor / nurse / receptionist, appointments, medical records,
prescriptions, lab tests, schedules) plus feedback, staff applications, activity log, vital signs,
patient documents and password resets.

Uploaded files live in the database rather than on disk, so every copy of the desktop app sees the
same documents through the shared MySQL server. PDF, JPG or PNG, 10 MB each:

- `application_document` — a weak entity of `staff_application` (like `prescription`), up to 5
  files per application. Only an administrator can download them.
- `patient_document` — the files a patient uploads on their profile, up to 50. Only that patient
  and an administrator can download them.

## Desktop app (Windows)

`electron/main.js` runs the API inside Electron, serves the built website from the same local
address (`127.0.0.1`, a free port) and shows it in a window. There is no separate server to start.

- **Try it:** `npm run electron:dev` (MySQL must be running).
- **Installer:** `npm run electron:build` creates `release/Healthcare Management System Setup 1.0.0.exe`.
- **Database:** every copy connects to the MySQL server named in `settings.json` in the app's data
  folder (`%APPDATA%\healthcare-system`). It is created on the first start: on a developer's machine
  from `server/.env`, elsewhere with defaults and its own login-token secret. Point every copy at the
  same shared MySQL server so all users see the same data; load it once with `npm run db:setup`.
  If the database cannot be reached, the app says so and offers to open `settings.json`.

## Known limitations

- There is no mail server: outside production the password-reset token is returned by the API and
  the reset page links to it directly.
- Uploaded documents are kept in the database, so a very large collection makes it grow quickly.
- Changing an account's type (e.g. patient to doctor) in User Management is rejected by the server.
- An account with appointments or medical records cannot be deleted (the schema keeps them);
  deactivate it instead. Deleting a patient removes their appointments and records with them.
- Vital signs are stored with the date they were measured, not the time of day.
