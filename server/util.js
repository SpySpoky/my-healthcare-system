// Helpers shared by the routes: ids, dates and input checks.
// The API speaks the same shapes the React app already uses, so
// dates are "YYYY-MM-DD" keys or short dates ("20 Sep 2026") and
// times are "09:30 AM".

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const forbidden = (message = "You do not have access to this.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

// Wraps an async route so errors reach the error handler.
export const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const pad = (value, length = 2) => String(value).padStart(length, "0");

// Shown for a doctor or staff member who has no department yet.
export const UNASSIGNED = "Unassigned";

/* ---------- ids shown by the front end ---------- */

export const userRef = (id) => `U${pad(id, 3)}`;
export const feedbackRef = (id) => `FB-${id}`;
export const applicationRef = (id) => `APP-${id}`;
export const activityRef = (id) => `ACT-${pad(id, 4)}`;

// "U007" -> 7, "FB-2001" -> 2001, 7 -> 7. NaN when it is not an id.
export const parseRef = (value) => Number(String(value).replace(/^[A-Za-z]+-?/, ""));

/* ---------- dates & times ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// "2026-09-20" -> "20 Sep 2026"
export const shortDate = (key) => {
  if (!key) return undefined;
  const [year, month, day] = String(key).slice(0, 10).split("-");

  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

// "14:30:00" -> "02:30 PM"
export const timeLabel = (time) => {
  const [hours, minutes] = String(time).split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";

  return `${pad(hours % 12 || 12)}:${pad(minutes)} ${period}`;
};

// "02:30 PM" or "14:30" -> "14:30:00"
export const timeValue = (time) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(time).trim());

  if (!match) throw badRequest(`Invalid time: ${time}`);

  let hours = Number(match[1]);

  if (match[3]) {
    hours = (hours % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  }

  return `${pad(hours)}:${match[2]}:00`;
};

// "HH:MM:SS" -> "HH:MM"
export const hhmm = (time) => String(time).slice(0, 5);

// MySQL DATETIME ("YYYY-MM-DD HH:MM:SS", UTC) -> ISO string.
export const isoTimestamp = (value) => (value ? `${String(value).replace(" ", "T")}Z` : undefined);

/* ---------- input checks ---------- */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const text = (value, { field, max = 255, required = false } = {}) => {
  const clean = value === undefined || value === null ? "" : String(value).trim();

  if (required && !clean) throw badRequest(`${field || "Value"} is required.`);
  if (clean.length > max) throw badRequest(`${field || "Value"} must be at most ${max} characters.`);

  return clean || null;
};

export const oneOf = (value, options, field = "Value") => {
  if (!options.includes(value)) {
    throw badRequest(`${field} must be one of: ${options.join(", ")}.`);
  }

  return value;
};

export const optionalDate = (value, field = "Date") => {
  if (value === undefined || value === null || value === "") return null;
  if (!DATE_KEY.test(String(value))) throw badRequest(`${field} must be YYYY-MM-DD.`);

  return String(value);
};

// "—" and "" mean "none" in the front end.
export const dash = (value) => (value === "—" || value === "" ? null : value);

export const intId = (value, field = "Id") => {
  const number = parseRef(value);

  if (!Number.isInteger(number) || number <= 0) throw badRequest(`${field} is invalid.`);

  return number;
};

export const passwordProblem = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (password.length > 72) return "Password must be at most 72 characters.";

  return null;
};
