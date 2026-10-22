import { query } from "./db.js";

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

// Adds a row to the audit log. A logging failure never breaks the
// request that triggered it.
export const logActivity = async ({ userId = null, name, role = null, action, module, status = "Success", ip = null }) => {
  try {
    await query(
      `INSERT INTO activity_log (user_id, user_name, role, action, module, status, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, String(name || "Unknown").slice(0, 100), role, String(action).slice(0, 500), module, status, ip && String(ip).slice(0, 45)]
    );
  } catch (error) {
    console.error("Could not write the activity log:", error.message);
  }
};
