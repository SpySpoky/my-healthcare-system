// Patients (profile) and users (administration).

import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { loadPatients, loadUsers } from "../data.js";
import { queryOne, withTransaction } from "../db.js";
import {
  EMAIL_PATTERN,
  badRequest,
  conflict,
  dash,
  forbidden,
  intId,
  notFound,
  oneOf,
  optionalDate,
  parseRef,
  route,
  text,
} from "../util.js";

export const patientsRouter = Router();
export const usersRouter = Router();

patientsRouter.use(requireAuth);
usersRouter.use(requireAuth, requireRole("admin"));

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const STATUSES = ["Active", "Inactive", "Suspended"];
const PHONE_PATTERN = /^\+?[0-9 ]{10,16}$/;

const assertEmailFree = async (tx, email, userId) => {
  const taken = (await tx.query("SELECT user_id FROM users WHERE email = ? AND user_id <> ?", [email, userId]))[0];

  if (taken) throw conflict("Another account already uses this email.");
};

const checkContact = ({ name, email, phone }) => {
  if (name !== undefined && name.length < 3) throw badRequest("Name must be at least 3 characters.");
  if (email !== undefined && !EMAIL_PATTERN.test(email)) throw badRequest("Enter a valid email address.");
  if (phone && !PHONE_PATTERN.test(phone)) throw badRequest("Enter a valid phone number (10–16 digits).");
};

// Looks a department up by name, creating it when it is new.
const departmentId = async (tx, name) => {
  const clean = dash(name);

  if (!clean || ["Administration", "General"].includes(clean)) return null;

  const found = (await tx.query("SELECT dept_id FROM department WHERE dept_name = ?", [clean]))[0];

  if (found) return found.dept_id;

  return (await tx.query("INSERT INTO department (dept_name) VALUES (?)", [clean])).insertId;
};

/* ---------- patients ---------- */

patientsRouter.patch(
  "/:id",
  route(async (req, res) => {
    const id = intId(req.params.id, "Patient");
    const { role } = req.user;
    const isSelf = role === "patient" && req.user.id === id;

    if (!isSelf && role !== "admin") throw forbidden();

    const body = req.body || {};
    const user = {};
    const patient = {};

    if (body.name !== undefined) user.full_name = text(body.name, { field: "Name", required: true, max: 100 });
    if (body.email !== undefined) {
      user.email = text(body.email, { field: "Email", required: true }).toLowerCase();
    }
    if (body.phone !== undefined) user.phone = text(body.phone, { field: "Phone", max: 30 });
    if (body.dateOfBirth !== undefined) user.date_of_birth = optionalDate(body.dateOfBirth, "Date of birth");

    if (body.status !== undefined && role === "admin") {
      user.status = oneOf(body.status, STATUSES, "Status");
    }

    if (body.gender !== undefined) {
      patient.gender = body.gender ? oneOf(body.gender, GENDERS, "Gender") : null;
    }
    if (body.bloodType !== undefined) {
      patient.blood_group = BLOOD_GROUPS.includes(body.bloodType) ? body.bloodType : null;
    }
    if (body.allergies !== undefined) patient.allergies = text(body.allergies, { field: "Allergies", max: 255 });
    if (body.address !== undefined) patient.address = text(body.address, { field: "Address", max: 255 });
    if (body.emergencyContactName !== undefined) {
      patient.emergency_contact_name = text(body.emergencyContactName, { field: "Emergency contact", max: 100 });
    }
    if (body.emergencyContactPhone !== undefined) {
      patient.emergency_contact_phone = text(body.emergencyContactPhone, { field: "Emergency phone", max: 30 });
    }

    checkContact({ name: user.full_name, email: user.email, phone: user.phone });

    if (user.date_of_birth && user.date_of_birth > new Date().toISOString().slice(0, 10)) {
      throw badRequest("Date of birth cannot be in the future.");
    }

    await withTransaction(async (tx) => {
      if (!(await tx.query("SELECT 1 FROM patient WHERE user_id = ?", [id])).length) {
        throw notFound("Patient not found.");
      }

      if (user.email) await assertEmailFree(tx, user.email, id);

      for (const [table, fields, key] of [["users", user, "user_id"], ["patient", patient, "user_id"]]) {
        const columns = Object.keys(fields);

        if (columns.length) {
          await tx.query(
            `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE ${key} = ?`,
            [...columns.map((column) => fields[column]), id]
          );
        }
      }
    });

    res.json({ patient: (await loadPatients({ onlyId: id }))[0] });
  })
);

/* ---------- users (admin) ---------- */

usersRouter.get(
  "/",
  route(async (_req, res) => {
    res.json({ users: await loadUsers() });
  })
);

usersRouter.patch(
  "/:id",
  route(async (req, res) => {
    const id = parseRef(req.params.id);
    const body = req.body || {};

    if (!Number.isInteger(id) || id <= 0) throw badRequest("Id is invalid.");

    const account = await queryOne(
      `SELECT u.user_id, u.user_type, s.staff_type
       FROM users u LEFT JOIN staff s ON s.user_id = u.user_id WHERE u.user_id = ?`,
      [id]
    );

    if (!account) throw notFound("User not found.");

    const currentRole =
      account.user_type === "staff" ? (account.staff_type === "doctor" ? "doctor" : "medical_staff") : account.user_type;

    if (body.role !== undefined && body.role !== currentRole) {
      throw badRequest("Changing an account's type is not supported. Create a new account instead.");
    }

    const fields = {};

    if (body.name !== undefined) fields.full_name = text(body.name, { field: "Name", required: true, max: 100 });
    if (body.email !== undefined) fields.email = text(body.email, { field: "Email", required: true }).toLowerCase();
    if (body.phone !== undefined) fields.phone = text(body.phone, { field: "Phone", max: 30 });

    if (body.status !== undefined) {
      fields.status = oneOf(body.status, STATUSES, "Status");

      if (id === req.user.id && fields.status !== "Active") {
        throw badRequest("You cannot deactivate your own account.");
      }
    }

    checkContact({ name: fields.full_name, email: fields.email, phone: fields.phone });

    await withTransaction(async (tx) => {
      if (fields.email) await assertEmailFree(tx, fields.email, id);

      const columns = Object.keys(fields);

      if (columns.length) {
        await tx.query(
          `UPDATE users SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE user_id = ?`,
          [...columns.map((column) => fields[column]), id]
        );
      }

      if (body.department !== undefined && account.user_type === "staff") {
        const dept = await departmentId(tx, body.department);

        await tx.query("UPDATE staff SET dept_id = ? WHERE user_id = ?", [dept, id]);
      }
    });

    const user = (await loadUsers()).find((item) => item.id === `U${String(id).padStart(3, "0")}`);

    res.json({ user });
  })
);
