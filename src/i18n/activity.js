// Translates the activity log's action text ("Booked appointment with Dr. X").
// The log stores English sentences (written by the app and the server), so
// they are matched by pattern when displayed. Unknown text is shown as it is.

import { getLanguage, lower, t } from "./index.js";

const VERBS = {
  Confirmed: () => t("confirmed"),
  Completed: () => t("completed"),
  Cancelled: () => t("cancelled"),
};

const PATTERNS = [
  [/^Logged in$/, () => t("Logged in")],
  [/^Logged in with (.+)$/, (m) => t("Logged in with {provider}", { provider: m[1] })],
  [/^Failed login attempt for (.+)$/, (m) => t("Failed login attempt for {email}", { email: m[1] })],
  [/^Registered a new patient account$/, () => t("Registered a new patient account")],
  [/^Password reset requested$/, () => t("Password reset requested")],
  [/^Updated profile information$/, () => t("Updated profile information")],
  [/^Booked appointment with (.+)$/, (m) => t("Booked appointment with {name}", { name: m[1] })],
  [/^Cancelled an appointment with (.+)$/, (m) => t("Cancelled an appointment with {name}", { name: m[1] })],
  [/^Rescheduled an appointment with (.+)$/, (m) => t("Rescheduled an appointment with {name}", { name: m[1] })],
  [/^(Confirmed|Completed|Cancelled) appointment with (.+)$/, (m) => t("{verb} appointment with {name}", { verb: VERBS[m[1]](), name: m[2] })],
  [/^Submitted (feedback|complaint|suggestion): (.+)$/, (m) => t("Submitted {type}: {subject}", { type: t(m[1]), subject: m[2] })],
  [/^Submitted feedback (FB-\d+)$/, (m) => t("Submitted feedback {id}", { id: m[1] })],
  [/^Responded to feedback (FB-\d+)$/, (m) => t("Responded to feedback {id}", { id: m[1] })],
  [/^Updated feedback (FB-\d+) status to (.+)$/, (m) => t("Updated feedback {id} status to {status}", { id: m[1], status: lower(t(m[2])) })],
  [/^Added diagnosis for patient #(\d+)$/, (m) => t("Added diagnosis for patient #{id}", { id: m[1] })],
  [/^Prescribed medication for patient #(\d+)$/, (m) => t("Prescribed medication for patient #{id}", { id: m[1] })],
  [/^Updated vital signs for patient #(\d+)$/, (m) => t("Updated vital signs for patient #{id}", { id: m[1] })],
  [/^Updated weekly availability$/, () => t("Updated weekly availability")],
  [/^Updated system notification settings$/, () => t("Updated system notification settings")],
  [/^(Approved|Rejected) application (APP-\d+)(?: \((.+)\))?$/, (m) =>
    m[1] === "Approved"
      ? t("Approved application {id}", { id: m[2] + (m[3] ? ` (${m[3]})` : "") })
      : t("Rejected application {id}", { id: m[2] + (m[3] ? ` (${m[3]})` : "") })],
  [/^Updated user (U\d+) \((.+)\)$/, (m) => t("Updated user {id} ({name})", { id: m[1], name: m[2] })],
  [/^Changed status of (U\d+) \((.+)\) to (.+)$/, (m) => t("Changed status of {id} ({name}) to {status}", { id: m[1], name: m[2], status: lower(t(m[3])) })],
  [/^Exported report \((.+)\)$/, (m) => t("Exported report ({range})", { range: m[1] })],
];

export const translateActivity = (action) => {
  // The log is written in English, so English is shown exactly as stored.
  if (typeof action !== "string" || getLanguage() === "en") return action;

  for (const [pattern, build] of PATTERNS) {
    const match = pattern.exec(action);

    if (match) return build(match);
  }

  return action;
};
