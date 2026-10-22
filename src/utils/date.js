// Date helpers. "Date keys" are YYYY-MM-DD strings in local time,
// the format used by <input type="date"> and by stored appointments.

import { getLocale, t } from "../i18n";

const pad = (value) => String(value).padStart(2, "0");

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Today's date as YYYY-MM-DD.
export const getTodayDate = () => toDateKey(new Date());

// YYYY-MM-DD for today plus `days` (negative for the past).
export const getRelativeDate = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return toDateKey(date);
};

// Parses a date key or a readable date ("20 September 2026").
export const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00`)
    : new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatWith = (value, options, locale = getLocale()) => {
  const date = parseDate(value);

  return date ? date.toLocaleDateString(locale, options) : String(value || "");
};

// "20 September 2026"
export const formatDate = (value) =>
  formatWith(value, { day: "numeric", month: "long", year: "numeric" });

// "20 Sep 2026"
export const formatShortDate = (value) =>
  formatWith(value, { day: "2-digit", month: "short", year: "numeric" });

// "Sunday, 20 September 2026"
export const formatLongDate = (value) =>
  formatWith(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// "Monday", "Tuesday", ... for a date key.
export const getWeekday = (value) =>
  formatWith(value, { weekday: "long" }, "en-US");

// Sort helper: newest first.
export const byDateDesc = (a, b) =>
  (parseDate(b.date) || 0) - (parseDate(a.date) || 0);

// "09:30 AM" -> minutes since midnight.
export const timeToMinutes = (time) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(time).trim());

  if (!match) {
    return 0;
  }

  let hours = Number(match[1]) % 12;

  if (!match[3]) {
    hours = Number(match[1]);
  } else if (match[3].toUpperCase() === "PM") {
    hours += 12;
  }

  return hours * 60 + Number(match[2]);
};

// A short date from the server ("20 Sep 2026") in the current language;
// anything that is not a date ("Never") is translated as text instead.
export const localDate = (value) => (parseDate(value) ? formatShortDate(value) : t(value));
