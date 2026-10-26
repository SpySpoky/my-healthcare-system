// Shared data for the administrator portal: user accounts, staff
// applications, patient feedback and the activity log. Everything
// is persisted (see storage.js) so changes made anywhere in the
// system appear on the dashboard, reports and activity log.

import { STORAGE_KEYS, loadStored, resetDemoData, saveStored } from "./storage";
import { fromDemo } from "./demoRegistry";
import { formatShortDate, getRelativeDate } from "../utils/date";

import { getLocale, t } from "../i18n";
export { loadStored, saveStored };

export const ADMIN_STORAGE_KEYS = {
  users: STORAGE_KEYS.users,
  applications: STORAGE_KEYS.applications,
  feedback: STORAGE_KEYS.feedback,
  activity: STORAGE_KEYS.activity,
};

export const CURRENT_ADMIN = "Test Administrator";

/* =====================================================
   USERS
   Accounts for every patient, doctor, staff member and admin.
===================================================== */

export const USER_ROLES = [
  { value: "patient", label: t("Patient") },
  { value: "doctor", label: t("Doctor") },
  { value: "medical_staff", label: t("Medical Staff") },
  { value: "admin", label: t("Administrator") },
];

export const USER_STATUSES = ["Active", "Inactive", "Suspended"];

export const getRoleLabel = (role) =>
  USER_ROLES.find((item) => item.value === role)?.label || role;

export const getNextUserId = (users) => {
  const highest = users.reduce(
    (max, user) => Math.max(max, Number(user.id.slice(1)) || 0),
    0
  );

  return `U${String(highest + 1).padStart(3, "0")}`;
};

/* =====================================================
   FEEDBACK & COMPLAINTS
   Submitted by patients on their Feedback page and handled
   by administrators on Feedback Management.
===================================================== */

export const FEEDBACK_TYPES = ["Feedback", "Complaint", "Suggestion"];

export const FEEDBACK_STATUSES = ["Open", "In Review", "Resolved", "Closed"];

export const FEEDBACK_PRIORITIES = ["Low", "Medium", "High"];

export const getNextFeedbackId = (feedback) =>
  `FB-${Math.max(2000, ...feedback.map((item) => Number(item.id.slice(3)) || 0)) + 1}`;

/* =====================================================
   ACTIVITY LOG
===================================================== */

export const ACTIVITY_MODULES = [
  "Authentication",
  "Appointments",
  "Medical Records",
  "Users",
  "Applications",
  "Feedback",
  "Reports",
  "Settings",
];

export const ACTIVITY_STATUSES = ["Success", "Warning", "Failed"];

/* =====================================================
   REPORT STATISTICS
   Aggregates computed by the database (see src/api/hydrate.js).
   Exported as lists that are filled in place.
===================================================== */

// [{ month, appointments, registrations, feedback }]
export const MONTHLY_STATS = [];

// [{ label, value }]
export const APPOINTMENT_STATUS_STATS = [];

// [{ label, value }] appointments per department
export const DEPARTMENT_STATS = [];

/* =====================================================
   STORES
===================================================== */

export const loadUsers = () => loadStored(STORAGE_KEYS.users, () => fromDemo("users", () => []));

export const loadApplications = () =>
  loadStored(STORAGE_KEYS.applications, () => fromDemo("applications", () => []));

export const getNextApplicationId = (applications) =>
  `APP-${Math.max(1000, ...applications.map((item) => Number(item.id.slice(4)) || 0)) + 1}`;

export const loadFeedback = () =>
  loadStored(STORAGE_KEYS.feedback, () => fromDemo("feedback", () => []));

export const saveFeedback = (feedback) =>
  saveStored(STORAGE_KEYS.feedback, feedback);

export const loadActivity = () =>
  loadStored(STORAGE_KEYS.activity, () => fromDemo("activity", () => []));

// Records an action in the system activity log.
export const logActivity = (actor, action, module, status = "Success") => {
  const activity = loadActivity();
  const highest = activity.reduce(
    (max, entry) => Math.max(max, Number(entry.id.slice(4)) || 0),
    0
  );

  saveStored(STORAGE_KEYS.activity, [
    {
      id: `ACT-${String(highest + 1).padStart(4, "0")}`,
      user: actor?.name || "Unknown",
      role: actor?.role || "—",
      action,
      module,
      status,
      ip: "10.0.1.4",
      timestamp: new Date().toISOString(),
    },
    ...activity,
  ]);
};

// Records an action taken by the signed-in administrator.
export const logAdminActivity = (action, module) =>
  logActivity({ name: CURRENT_ADMIN, role: "admin" }, action, module);

export const resetAdminDemoData = resetDemoData;

/* =====================================================
   FORMATTING
===================================================== */

export const formatTodayShort = () => formatShortDate(getRelativeDate(0));

export const formatTimestamp = (timestamp) =>
  new Date(timestamp).toLocaleString(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
