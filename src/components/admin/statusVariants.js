// Maps admin-portal statuses to Badge variants.
const STATUS_VARIANTS = {
  Active: "success",
  Inactive: "secondary",
  Suspended: "danger",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
  Open: "warning",
  "In Review": "info",
  Resolved: "success",
  Closed: "secondary",
  Success: "success",
  Warning: "warning",
  Failed: "danger",
  High: "danger",
  Medium: "warning",
  Low: "secondary",
};

export const getStatusVariant = (status) =>
  STATUS_VARIANTS[status] || "default";
