// Patients (profile) and users (administration).

import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { logActivity } from "../activity.js";
import { loadPatients, loadUsers } from "../data.js";
import { query, queryOne, withTransaction } from "../db.js";
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
  passwordProblem,
  route,
  text,
  userRef,
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

// Builds the slug the front end uses for a doctor ("sarah-johnson").
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/^dr\.?\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Creates the rows of the specialization the role belongs to.
const createSubtype = async (tx, { role, userId, name, deptId, licenseNumber, specialization }) => {
  if (role === "patient") {
    await tx.query("INSERT INTO patient (user_id) VALUES (?)", [userId]);
    return;
  }

  if (role === "admin") {
    await tx.query("INSERT INTO admin (user_id) VALUES (?)", [userId]);
    return;
  }

  const isDoctor = role === "doctor";
  const license = licenseNumber || `${isDoctor ? "MD" : "RN"}-NEW-${userId}`;

  await tx.query("INSERT INTO staff (user_id, staff_type, dept_id) VALUES (?, ?, ?)", [
    userId,
    isDoctor ? "doctor" : "nurse",
    deptId,
  ]);

  if (isDoctor) {
    let slug = slugify(name) || `doctor-${userId}`;

    if ((await tx.query("SELECT 1 FROM doctor WHERE slug = ?", [slug])).length) slug = `${slug}-${userId}`;

    await tx.query("INSERT INTO doctor (user_id, slug, specialization, license_number) VALUES (?, ?, ?, ?)", [
      userId,
      slug,
      specialization || "Specialist",
      license,
    ]);
  } else {
    await tx.query("INSERT INTO nurse (user_id, license_number) VALUES (?, ?)", [userId, license]);
  }
};

usersRouter.post(
  "/",
  route(async (req, res) => {
    const body = req.body || {};
    const name = text(body.name, { field: "Name", required: true, max: 100 });
    const email = text(body.email, { field: "Email", required: true }).toLowerCase();
    const phone = text(body.phone, { field: "Phone", max: 30 });
    const role = oneOf(body.role, ["patient", "doctor", "medical_staff", "admin"], "Role");
    const problem = passwordProblem(body.password);

    checkContact({ name, email, phone });

    if (problem) throw badRequest(problem);

    if (["doctor", "medical_staff"].includes(role) && !dash(body.department)) {
      throw badRequest("Department is required for medical staff.");
    }

    const hash = await bcrypt.hash(body.password, 10);

    const userId = await withTransaction(async (tx) => {
      if ((await tx.query("SELECT 1 FROM users WHERE email = ?", [email])).length) {
        throw conflict("Another account already uses this email.");
      }

      const deptId = await departmentId(tx, body.department);
      const { insertId } = await tx.query(
        "INSERT INTO users (full_name, email, password, phone, user_type) VALUES (?, ?, ?, ?, ?)",
        [name, email, hash, phone, ["doctor", "medical_staff"].includes(role) ? "staff" : role]
      );

      await createSubtype(tx, {
        role,
        userId: insertId,
        name,
        deptId,
        licenseNumber: text(body.licenseNumber, { field: "License number", max: 50 }),
        specialization: text(body.specialization, { field: "Specialization", max: 100 }),
      });

      return insertId;
    });

    await logActivity({
      userId: req.user.id,
      name: req.user.name,
      role: "admin",
      action: `Created user ${userRef(userId)} (${name})`,
      module: "Users",
      ip: req.ip,
    });

    const user = (await loadUsers()).find((item) => item.id === userRef(userId));

    res.status(201).json({ user });
  })
);

usersRouter.delete(
  "/:id",
  route(async (req, res) => {
    const id = parseRef(req.params.id);

    if (!Number.isInteger(id) || id <= 0) throw badRequest("Id is invalid.");
    if (id === req.user.id) throw badRequest("You cannot delete your own account.");

    const account = await queryOne("SELECT user_id, full_name FROM users WHERE user_id = ?", [id]);

    if (!account) throw notFound("User not found.");

    // Appointments, medical records and lab tests keep their doctor
    // (ON DELETE RESTRICT), so a doctor with clinical history stays.
    try {
      await query("DELETE FROM users WHERE user_id = ?", [id]);
    } catch (error) {
      if (error?.code === "ER_ROW_IS_REFERENCED_2" || error?.errno === 1451) {
        throw conflict(
          "This account has appointments or medical records and cannot be deleted. Deactivate it instead."
        );
      }

      throw error;
    }

    await logActivity({
      userId: req.user.id,
      name: req.user.name,
      role: "admin",
      action: `Deleted user ${userRef(id)} (${account.full_name})`,
      module: "Users",
      status: "Warning",
      ip: req.ip,
    });

    res.status(204).end();
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
