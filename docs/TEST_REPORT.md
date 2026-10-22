# Test Report — Phase 9 (W106–W115) and backend

**Project:** Centralized Healthcare Management System
**Date:** 22 October 2026
**Scope:** The website (on the demo fixtures), the Turkish translation, and the Express API
against a real MySQL database.

## 1. How to run the tests

```bash
npm install
npm test            # website suite (no server or database needed)
npm run test:tr     # the website in Turkish
npm run test:api    # API suite against a throwaway healthcare_test MySQL database
npm run test:watch  # re-run the website tests while editing
```

Tests use **Vitest** with **React Testing Library** in a simulated browser (jsdom) and
**Supertest** for the API. Each website test starts from the clean demo dataset and renders
the complete application, so the tests exercise real routing, sign-in, page loading and the
shared data. The API suite recreates the `healthcare_test` database from `server/db/schema.sql`
and the demo data before it runs (MySQL must be running, see the README).

## 2. Summary

| Test file | Plan task(s) | Tests | Result |
|---|---|---:|---|
| `src/test/auth.test.jsx` | W106 Login and registration validation | 15 | Pass |
| `src/test/patient.test.jsx` | W107 Appointments, W108 Medical records, W109 Feedback | 17 | Pass |
| `src/test/doctor.test.jsx` | W110 Schedule and availability, W111 Patient records | 16 | Pass |
| `src/test/admin.test.jsx` | W112 Admin pages | 9 | Pass |
| `src/test/app.test.jsx` | W113 Navigation, W114 Page states | 14 | Pass |
| `src/test/regression.test.jsx` | W115 Regression across all pages | 31 | Pass |
| `src/test/messages.test.jsx` | Messages between patients and doctors | 4 | Pass |
| `src/test/units.test.js` | Validation and data helpers | 12 | Pass |
| **Website (`npm test`)** | | **118** | **118 passed** |
| `src/test/tr/behaviour.test.jsx` | Turkish: translation, formatting, pages | 17 | Pass |
| `src/test/tr/scan.test.jsx` | Turkish: every page scanned for untranslated text | 31 | Pass |
| **Turkish (`npm run test:tr`)** | | **48** | **48 passed** |
| `server/test/api.test.js` | Every API endpoint: access rules, validation, data changes | 40 | Pass |
| `server/test/frontend-sync.test.js` | The website's data layer saving through the real API | 7 | Pass |
| `server/test/portals.test.jsx` | Every portal page rendered with data from MySQL | 28 | Pass |
| **API (`npm run test:api`)** | | **75** | **75 passed** |
| **Total** | | **241** | **241 passed** |

`npm run lint`, `npm run build` and `npm run i18n:check` (0 missing translations) also pass.

## 3. Test cases by task

### W106 — Login and registration UI validation
- `/login` shows only the four account types and *Create an account* (no email or password fields).
- Choosing a role changes the URL (e.g. `/login/doctor`) and shows email, password and *Forgot Password*; *Change account type* returns to `/login`.
- An unknown role in the URL (`/login/nurse`) returns to `/login`.
- Required fields, email format and minimum password length are validated.
- An account of a different type is rejected (*not registered as a Doctor*); unknown and suspended accounts are rejected.
- Each demo account signs in to its own portal; *Remember me* off keeps the session only for the browser session.
- Registration: every empty field shows an error; future date of birth, weak password and mismatched passwords are rejected; an existing email is rejected; a successful registration creates both the login account and the patient record, and the new patient can sign in.
- Forgot password validates the email and confirms the request; reset password requires a token and matching strong passwords.

### W107 — Patient appointment interactions
- Booking form validation (department, doctor, reason, past dates).
- Only the doctor's free times are offered: no times on non-working days, already-booked times hidden.
- A booking is saved as **Pending** for the selected doctor.
- Upcoming / Past / Cancelled views and the details dialog.
- Cancelling requires confirmation (*Keep Appointment* leaves it unchanged).
- Rescheduling rejects the current time, saves the new date and time, and returns the appointment to **Pending**.
- Cancelled appointments and other patients' appointments cannot be rescheduled.

### W108 — Patient medical-record display
- Patient details (name, ID, allergies) come from the signed-in patient's record.
- Every tab (history, diagnoses, prescriptions, appointments, notes) shows the patient's data.
- Entries added by a doctor appear in the patient's records.
- Search finds records and shows an empty state when nothing matches.

### W109 — Patient feedback submission
- The list shows the patient's feedback, including administrator responses.
- Form validation for subject and message.
- Submitted feedback reaches the administrator feedback store as **Open**.
- Unreviewed feedback can be edited and deleted (with confirmation); reviewed feedback is read-only.
- Empty state when the patient has no feedback.

### W110 — Doctor schedule and availability
- The dashboard shows today's schedule from the shared appointments.
- Appointment tabs (Today, Completed, Cancelled) list the right appointments.
- Confirm, Complete and Cancel each ask for confirmation and update the appointment.
- Medical staff see every doctor's appointments.
- Availability: end-before-start and overlapping slots are rejected; a new slot is saved and becomes bookable by patients; slots can be disabled and removed (with confirmation); medical staff see an explanation instead of a schedule.

### W111 — Doctor patient-record interactions
- Patient search and empty state; opening a record from the list.
- The record shows the patient's details and diagnoses.
- Add Diagnosis: required fields, no future dates, saved to the shared record and signed by the doctor.
- Prescription saved to the shared record.
- Escape closes the diagnosis dialog.
- The Status route shows monitoring and flags out-of-range readings.
- An unknown patient shows a *Patient Not Found* page.

### W112 — Admin pages
- Dashboard KPIs reflect the shared data.
- Users: search, role/status filters, pagination, empty state; edit validation (format and duplicate email) and save, kept in sync with the patient record; deactivation with confirmation blocks sign-in; the admin cannot deactivate their own account.
- Applications: rejecting needs a reason; approving creates an active account.
- Feedback: resolving requires a response, which the patient then sees; inbox filters and empty state.
- Reports: changing the period updates totals; CSV export works and is logged.
- Activity: status filter, date-range validation, empty state.

### W113 — Navigation and back/forward
- The active sidebar link is marked (`aria-current="page"`); Back and Forward move between pages correctly.
- Breadcrumbs and the header title link to parent pages and the dashboard.
- Patient-record tabs follow the URL, including Back to the Status view.
- `/patient` opens the dashboard; another role's pages show *Access Denied* with a link back to the user's own dashboard.
- A signed-in user opening `/login` goes to their dashboard.
- After logout, protected pages lead to the login page.
- Unknown addresses show the 404 page.

### W114 — Loading, empty, success and error states
- A loading skeleton shows before page data.
- A failed load shows an error with *Try Again* (simulated with `?mockError=1`).
- Empty states: no upcoming appointments (with a *Book an Appointment* link), no pending applications.
- Success message after saving the profile; inline errors for invalid profile data.

### W115 — Regression
Every page for every role (patient, doctor, medical staff, admin) and every public page
renders its main heading, sets the browser-tab title, and produces **no React errors or warnings**.

### Backend (API against MySQL)
- Sign-in checks the real password hash; wrong passwords, wrong account types and suspended accounts are rejected.
- Every endpoint enforces its role: patients only see and change their own data, administrators cannot read clinical records.
- Appointments, feedback, applications, availability, documents, messages and clinical records are created, changed and deleted through the API and checked in the database.
- Feedback sent straight to the API (bypassing the form) gets the same rules as the form: length limits, no links, HTML, code or inappropriate language.
- The website's data layer (`src/api/persist.js`) is tested against the running API, including recovery when the server rejects a change.
- Every portal page renders with the data loaded from MySQL.

### Turkish language
- Text, placeholders, dates, numbers and API error messages are shown in Turkish.
- Every page is scanned for text left in English.

## 4. Defects found and fixed during testing

| # | Area | Defect | Fix |
|---|---|---|---|
| 1 | All dialogs | No dialog had `role="dialog"`, so screen readers did not announce them; none could be closed with Escape. | Added dialog roles and labels to every modal and confirmation, and Escape-to-close. |
| 2 | Patient feedback | Edit and Delete were shown on feedback already answered by an administrator; editing would erase the reply. | Only unreviewed feedback can be edited or deleted; reviewed feedback shows a read-only note. |
| 3 | Patient feedback | Field errors were not linked to their inputs (`aria-describedby`). | The form now uses the shared field error support. |
| 4 | Diagnosis, prescription, availability and feedback forms | Without `noValidate`, the browser's own popups replaced the app's inline messages (e.g. a future diagnosis date was blocked silently). | All forms now use the app's inline validation consistently. |
| 5 | Login | A signed-in user going Back to `/login` saw the login screen again. | Signed-in users are redirected to their dashboard. |
| 6 | Availability | Success and error banners were not announced to screen readers. | Added `role="alert"` / `role="status"`; slots are labelled groups. |
| 7 | Login | The demo-account hint said "any password with 8+ characters", left over from the mock sign-in; the real server needs `password123`. | The hint shows the real password, and *Use demo account* fills it in. |
| 8 | Feedback API | The server accepted subjects up to 150 and messages up to 2000 characters with no minimum and no content checks, so the form's rules could be bypassed. | Form and server now share one rule file (`src/utils/validation/feedbackRules.js`). |

## 5. Notes and limitations
- Website tests run in a simulated browser (jsdom). Visual layout and responsiveness were checked separately in a real browser during Phase 7 (1280×800, 1024×700 and phone width).
- The website suite runs on the demo fixtures without a server; password *verification* is covered by the API suite.
- Report figures for historical months are fixed demo values; live figures (users, applications, feedback, activity) are tested against the shared data.
