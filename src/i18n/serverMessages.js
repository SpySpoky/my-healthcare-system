// Translates the error messages the API sends (they are always English).
// Fixed messages are looked up in the dictionary; messages with a variable
// part ("Email is required.") are matched by pattern.

import { lower, t } from "./index.js";

// Every fixed message the API can send. Each one needs a Turkish entry
// (`node tools/i18n/check.mjs` verifies this).
export const KNOWN_SERVER_MESSAGES = [
  "A document entry is too large.",
  "Administrators cannot view clinical records.",
  "An account with this email already exists.",
  "An account with this email already exists. Try signing in instead.",
  "An application for this email is already waiting for review.",
  "Another account already uses this email.",
  "Application not found.",
  "Appointment not found.",
  "Changing an account's type is not supported. Create a new account instead.",
  "Choose a valid doctor.",
  "Code or scripts are not allowed.",
  "Date must be YYYY-MM-DD.",
  "Date of birth cannot be in the future.",
  "Doctor not found.",
  "Enter a valid email address.",
  "Enter a valid phone number (10–16 digits).",
  "Feedback not found.",
  "Give a reason for rejection (at least 10 characters).",
  "Google sign-in failed. Please try again.",
  "Google sign-in is not configured on the server.",
  "HTML tags are not allowed.",
  "Id is invalid.",
  "If an account exists for this email, a reset link has been sent.",
  "Incorrect email or password.",
  "Invalid characters are not allowed.",
  "Links and URLs are not allowed.",
  "Message not found.",
  "Name must be at least 3 characters.",
  "No account exists for this Google email. Create an account first.",
  "Not found.",
  "Origin not allowed.",
  "Password must be at least 8 characters.",
  "Password must be at most 72 characters.",
  "Patient not found.",
  "Patients can only cancel or reschedule appointments.",
  "Please remove inappropriate language.",
  "Please complete the security check.",
  "Please sign in.",
  "Rating must be 1 to 5.",
  "That time was just booked. Please choose another.",
  "The appointment date cannot be in the past.",
  "The date cannot be in the future.",
  "The doctor is not available at that time.",
  "The end time must be after the start time.",
  "The new date cannot be in the past.",
  "The request body is not valid JSON.",
  "The request is too large.",
  "The security check is unavailable. Please try again.",
  "Something went wrong on the server.",
  "This account is not active.",
  "This application was already reviewed.",
  "This reset link is invalid or has expired.",
  "Times must be HH:MM.",
  "Too many attempts. Please try again in a few minutes.",
  "Unknown record section.",
  "User not found.",
  "Write a response to the patient before resolving or closing this.",
  "You cannot deactivate your own account.",
  "You cannot send a message to this person.",
  "Your Google email address is not verified.",
  "Your application was submitted for review.",
  "Your password has been updated.",
  "Your session has expired. Please sign in again.",
  "documents must be a list of at most 50 items.",
  "slots must be a list of at most 100 items.",
];

// Messages with a variable part.
const PATTERNS = [
  [/^(.+) is required\.$/, (m) => t("{field} is required.", { field: t(m[1]) })],
  [/^(.+) is invalid\.$/, (m) => t("{field} is invalid.", { field: t(m[1]) })],
  [/^(.+) must be YYYY-MM-DD\.$/, (m) => t("{field} must be YYYY-MM-DD.", { field: t(m[1]) })],
  [/^(.+) must be at least (\d+) characters\.$/, (m) => t("{field} must be at least {min} characters.", { field: t(m[1]), min: m[2] })],
  [/^(.+) must be at most (\d+) characters\.$/, (m) => t("{field} must be at most {max} characters.", { field: t(m[1]), max: m[2] })],
  [/^(.+) must be one of: (.+)\.$/, (m) => t("{field} must be one of: {options}.", { field: t(m[1]), options: m[2].split(", ").map((option) => t(option)).join(", ") })],
  [/^Invalid time: (.+)$/, (m) => t("Invalid time: {time}", { time: m[1] })],
  [/^Slots on (.+) overlap\.$/, (m) => t("Slots on {day} overlap.", { day: t(m[1]) })],
  [/^This account is (.+)\. Please contact the administrator\.$/, (m) => t("This account is {status}. Please contact the administrator.", { status: lower(t(m[1].charAt(0).toUpperCase() + m[1].slice(1))) })],
  [/^This account is not registered as (an?) (.+)\. Select the correct account type and try again\.$/, (m) => t("This account is not registered as {role}. Select the correct account type and try again.", { role: t(m[2]) })],
  [/^This appointment is already (.+)\.$/, (m) => t("This appointment is already {status}.", { status: lower(t(m[1].charAt(0).toUpperCase() + m[1].slice(1))) })],
];

export const translateServerMessage = (message) => {
  if (typeof message !== "string") return message;

  const exact = t(message);

  if (exact !== message) return exact;

  for (const [pattern, build] of PATTERNS) {
    const match = pattern.exec(message);

    if (match) return build(match);
  }

  return message;
};
