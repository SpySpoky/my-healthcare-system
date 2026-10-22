// Mock sign-in for the frontend phase. Accounts come from the
// fixed demo accounts below plus the admin user list (which
// includes newly registered patients and approved staff).

import { getRoleLabel, loadUsers } from "./adminData";
import { getDoctorByEmail } from "./doctorsData";
import { getPatientByEmail } from "./patientsData";

import { getLanguage, lower, t } from "../i18n";
export const LOGIN_ROLES = [
  {
    value: "patient",
    slug: "patient",
    label: t("Patient"),
    description: t("Appointments & records"),
    icon: "🧑",
  },
  {
    value: "doctor",
    slug: "doctor",
    label: t("Doctor"),
    description: t("Patients & schedule"),
    icon: "🩺",
  },
  {
    value: "medical_staff",
    slug: "medical-staff",
    label: t("Medical Staff"),
    description: t("Nursing & care team"),
    icon: "💉",
  },
  {
    value: "admin",
    slug: "admin",
    label: t("Administrator"),
    description: t("System management"),
    icon: "🛡️",
  },
];

// Role chosen on /login/:slug, or undefined for an unknown slug.
export const getLoginRoleBySlug = (slug) =>
  LOGIN_ROLES.find((role) => role.slug === slug);

// Demo sign-in emails offered on the login page (see server/db/demo-data.json).
// Every demo account's password (set by server/scripts/setup-db.js).
export const DEMO_PASSWORD = "password123";

export const DEMO_ACCOUNTS = {
  patient: { email: "patient@test.com" },
  doctor: { email: "doctor@test.com" },
  medical_staff: { email: "staff@test.com" },
  admin: { email: "admin@test.com" },
};

const findAccount = (email) =>
  loadUsers().find((item) => item.email.toLowerCase() === email) || null;

// Links the account to the patient or doctor record it represents.
const withProfileIds = (account) => {
  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };

  if (account.role === "patient") {
    user.patientId = getPatientByEmail(account.email)?.id ?? null;
  }

  if (account.role === "doctor") {
    user.doctorId = getDoctorByEmail(account.email)?.id ?? null;
  }

  return user;
};

// Returns { user } on success or { error } with a message.
// Passwords are not checked in the mock (no backend yet).
export const authenticate = ({ role, email }) => {
  const account = findAccount(email.trim().toLowerCase());

  if (!account) {
    return { error: t("Incorrect email or password.") };
  }

  if (account.role !== role) {
    return {
      error: t("This account is not registered as {role}. Select the correct account type and try again.", {
        // English needs "a Doctor" / "an Administrator"; Turkish has no articles.
        role:
          getLanguage() === "en"
            ? `${role === "admin" ? "an" : "a"} ${getRoleLabel(role)}`
            : getRoleLabel(role),
      }),
    };
  }

  if (account.status !== "Active") {
    return {
      error: t("This account is {status}. Please contact the administrator.", {
        status: lower(t(account.status)),
      }),
    };
  }

  return { user: withProfileIds(account) };
};
