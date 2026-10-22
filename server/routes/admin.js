// Feedback, staff applications, activity log and patient documents.

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { ACTIVITY_MODULES, ACTIVITY_STATUSES, logActivity } from "../activity.js";
import { requireAuth, requireRole } from "../auth.js";
import {
  loadActivity,
  loadApplications,
  loadDocuments,
  loadFeedback,
  loadFeedbackItem,
} from "../data.js";
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
  parseRef,
  route,
  text,
} from "../util.js";
import {
  ALLOWED_FEEDBACK_TYPES,
  MAX_MESSAGE_LENGTH,
  MAX_SUBJECT_LENGTH,
  MIN_MESSAGE_LENGTH,
  MIN_SUBJECT_LENGTH,
  textContentProblem,
} from "../../src/utils/validation/feedbackRules.js";

export const feedbackRouter = Router();
export const applicationsRouter = Router();
export const activityRouter = Router();
export const documentsRouter = Router();

/* =====================================================
   FEEDBACK
===================================================== */

feedbackRouter.use(requireAuth);

const TYPES = ALLOWED_FEEDBACK_TYPES;
const STATUSES = ["Open", "In Review", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High"];

const priorityFor = (type, rating) =>
  type === "Complaint" || rating <= 2 ? "High" : rating === 3 ? "Medium" : "Low";

// Same rules as the patient's feedback form (feedbackRules.js).
const feedbackText = (value, field, min, max) => {
  const clean = text(value, { field, required: true, max });

  if (clean.length < min) throw badRequest(`${field} must be at least ${min} characters.`);

  const problem = textContentProblem(clean);

  if (problem) throw badRequest(problem);

  return clean;
};

const feedbackSubject = (value) => feedbackText(value, "Subject", MIN_SUBJECT_LENGTH, MAX_SUBJECT_LENGTH);
const feedbackMessage = (value) => feedbackText(value, "Message", MIN_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH);

const checkRating = (value) => {
  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest("Rating must be 1 to 5.");

  return rating;
};

feedbackRouter.post(
  "/",
  requireRole("patient"),
  route(async (req, res) => {
    const body = req.body || {};
    const type = oneOf(body.type, TYPES, "Type");
    const subject = feedbackSubject(body.subject);
    const message = feedbackMessage(body.message);
    const rating = checkRating(body.rating);

    const { insertId } = await query(
      `INSERT INTO feedback (patient_id, type, subject, message, rating, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, subject, message, rating, priorityFor(type, rating)]
    );

    res.status(201).json({ feedback: await loadFeedbackItem(insertId) });
  })
);

feedbackRouter.patch(
  "/:id",
  route(async (req, res) => {
    const id = intId(req.params.id, "Feedback");
    const item = await queryOne("SELECT patient_id, status FROM feedback WHERE feedback_id = ?", [id]);
    const body = req.body || {};

    if (!item) throw notFound("Feedback not found.");

    if (req.user.role === "patient") {
      if (item.patient_id !== req.user.id) throw forbidden();

      const type = oneOf(body.type, TYPES, "Type");
      const rating = checkRating(body.rating);

      // Editing re-opens the item and clears any previous response.
      await query(
        `UPDATE feedback SET type = ?, subject = ?, message = ?, rating = ?, priority = ?, status = 'Open',
                response = NULL, responded_at = NULL, responded_by = NULL
         WHERE feedback_id = ?`,
        [
          type,
          feedbackSubject(body.subject),
          feedbackMessage(body.message),
          rating,
          priorityFor(type, rating),
          id,
        ]
      );
    } else if (req.user.role === "admin") {
      const status = body.status === undefined ? undefined : oneOf(body.status, STATUSES, "Status");
      const priority = body.priority === undefined ? undefined : oneOf(body.priority, PRIORITIES, "Priority");
      const response = body.response === undefined ? undefined : text(body.response, { field: "Response", max: 2000 });

      if (["Resolved", "Closed"].includes(status) && !response && !(await queryOne(
        "SELECT 1 AS ok FROM feedback WHERE feedback_id = ? AND response IS NOT NULL", [id]))) {
        throw badRequest("Write a response to the patient before resolving or closing this.");
      }

      const sets = [];
      const values = [];

      if (status !== undefined) { sets.push("status = ?"); values.push(status); }
      if (priority !== undefined) { sets.push("priority = ?"); values.push(priority); }

      if (response) {
        sets.push("response = ?", "responded_at = CURDATE()", "responded_by = ?");
        values.push(response, req.user.id);
      }

      if (sets.length) {
        await query(`UPDATE feedback SET ${sets.join(", ")} WHERE feedback_id = ?`, [...values, id]);
      }
    } else {
      throw forbidden();
    }

    res.json({ feedback: await loadFeedbackItem(id) });
  })
);

feedbackRouter.delete(
  "/:id",
  route(async (req, res) => {
    const id = intId(req.params.id, "Feedback");
    const item = await queryOne("SELECT patient_id FROM feedback WHERE feedback_id = ?", [id]);

    if (!item) throw notFound("Feedback not found.");
    if (!(req.user.role === "admin" || (req.user.role === "patient" && item.patient_id === req.user.id))) {
      throw forbidden();
    }

    await query("DELETE FROM feedback WHERE feedback_id = ?", [id]);
    res.status(204).end();
  })
);

feedbackRouter.get(
  "/",
  route(async (req, res) => {
    const { role, id } = req.user;

    res.json({
      feedback: await loadFeedback(
        role === "patient" ? { patientId: id } : role === "doctor" ? { doctorUserId: id } : {}
      ),
    });
  })
);

/* =====================================================
   APPLICATIONS
===================================================== */

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/^dr\.?\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Anyone can apply; administrators review the requests.
applicationsRouter.post(
  "/",
  route(async (req, res) => {
    const body = req.body || {};
    const email = text(body.email, { field: "Email", required: true }).toLowerCase();

    if (!EMAIL_PATTERN.test(email)) throw badRequest("Enter a valid email address.");

    const name = text(body.name, { field: "Name", required: true, max: 100 });
    const role = oneOf(body.role, ["doctor", "medical_staff"], "Role");
    const documents = Array.isArray(body.documents) ? body.documents.slice(0, 10).map((d) => String(d).slice(0, 150)) : [];
    const password = body.password ? await bcrypt.hash(String(body.password), 10) : null;

    if (await queryOne("SELECT 1 AS ok FROM users WHERE email = ?", [email])) {
      throw conflict("An account with this email already exists.");
    }

    if (await queryOne("SELECT 1 AS ok FROM staff_application WHERE email = ? AND status = 'Pending'", [email])) {
      throw conflict("An application for this email is already waiting for review.");
    }

    const department = dash(body.department);
    const dept = department
      ? await queryOne("SELECT dept_id FROM department WHERE dept_name = ?", [department])
      : null;

    await query(
      `INSERT INTO staff_application
         (full_name, email, password, phone, role, dept_id, license_number, experience_years, qualification, documents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        password,
        text(body.phone, { field: "Phone", max: 30 }),
        role,
        dept?.dept_id ?? null,
        text(body.licenseNumber, { field: "License number", max: 50 }),
        Math.max(0, Number(body.experience) || 0),
        text(body.qualification, { field: "Qualification", max: 255 }),
        JSON.stringify(documents),
      ]
    );

    res.status(201).json({ message: "Your application was submitted for review." });
  })
);

applicationsRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  route(async (_req, res) => {
    res.json({ applications: await loadApplications() });
  })
);

// Creates the staff account for an approved application.
const createStaffAccount = async (tx, application, deptId) => {
  const password = application.password || (await bcrypt.hash(randomBytes(18).toString("hex"), 10));
  const isDoctor = application.role === "doctor";
  const license = application.license_number && application.license_number !== "—"
    ? application.license_number
    : `${isDoctor ? "MD" : "RN"}-APP-${application.application_id}`;
  const staffType = isDoctor ? "doctor" : /^RT/i.test(license) ? "technician" : "nurse";

  const { insertId: userId } = await tx.query(
    `INSERT INTO users (full_name, email, password, phone, user_type) VALUES (?, ?, ?, ?, 'staff')`,
    [application.full_name, application.email.toLowerCase(), password, application.phone]
  );

  await tx.query("INSERT INTO staff (user_id, staff_type, dept_id) VALUES (?, ?, ?)", [userId, staffType, deptId]);

  if (isDoctor) {
    let slug = slugify(application.full_name) || `doctor-${userId}`;

    if ((await tx.query("SELECT 1 FROM doctor WHERE slug = ?", [slug])).length) slug = `${slug}-${userId}`;

    const dept = deptId
      ? (await tx.query("SELECT dept_name FROM department WHERE dept_id = ?", [deptId]))[0]?.dept_name
      : null;

    await tx.query(
      "INSERT INTO doctor (user_id, slug, specialization, license_number) VALUES (?, ?, ?, ?)",
      [userId, slug, dept ? `${dept} Specialist` : "Specialist", license]
    );
  } else if (staffType === "nurse") {
    await tx.query("INSERT INTO nurse (user_id, license_number) VALUES (?, ?)", [userId, license]);
  }

  return userId;
};

applicationsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  route(async (req, res) => {
    const id = parseRef(req.params.id);
    const decision = oneOf(req.body?.status, ["Approved", "Rejected"], "Decision");
    const note = text(req.body?.reviewNote, { field: "Review note", max: 1000 });

    if (decision === "Rejected" && (!note || note.length < 10)) {
      throw badRequest("Give a reason for rejection (at least 10 characters).");
    }

    await withTransaction(async (tx) => {
      const application = (
        await tx.query("SELECT * FROM staff_application WHERE application_id = ? FOR UPDATE", [id])
      )[0];

      if (!application) throw notFound("Application not found.");
      if (application.status !== "Pending") throw conflict("This application was already reviewed.");

      if (decision === "Approved") {
        const exists = (await tx.query("SELECT 1 FROM users WHERE email = ?", [application.email]))[0];

        if (!exists) await createStaffAccount(tx, application, application.dept_id);
      }

      await tx.query(
        `UPDATE staff_application
         SET status = ?, review_note = ?, reviewed_at = CURDATE(), reviewed_by = ?, password = NULL
         WHERE application_id = ?`,
        [decision, note || (decision === "Approved" ? "Approved after document review." : null), req.user.id, id]
      );
    });

    const applications = await loadApplications();

    res.json({ application: applications.find((item) => item.id === `APP-${id}`) });
  })
);

/* =====================================================
   ACTIVITY LOG
===================================================== */

activityRouter.use(requireAuth);

// The actor always comes from the session, never from the request.
activityRouter.post(
  "/",
  route(async (req, res) => {
    const body = req.body || {};

    await logActivity({
      userId: req.user.id,
      name: req.user.name,
      role: req.user.role,
      action: text(body.action, { field: "Action", required: true, max: 500 }),
      module: oneOf(body.module, ACTIVITY_MODULES, "Module"),
      status: body.status ? oneOf(body.status, ACTIVITY_STATUSES, "Status") : "Success",
      ip: req.ip,
    });

    res.status(201).json({ ok: true });
  })
);

activityRouter.get(
  "/",
  requireRole("admin"),
  route(async (_req, res) => {
    res.json({ activity: await loadActivity() });
  })
);

/* =====================================================
   PATIENT DOCUMENTS (profile uploads, metadata only)
===================================================== */

documentsRouter.use(requireAuth);

documentsRouter.put(
  "/:id/documents",
  route(async (req, res) => {
    const patientId = intId(req.params.id, "Patient");

    if (!(req.user.role === "admin" || (req.user.role === "patient" && req.user.id === patientId))) {
      throw forbidden();
    }

    const documents = req.body?.documents;

    if (!Array.isArray(documents) || documents.length > 50) {
      throw badRequest("documents must be a list of at most 50 items.");
    }

    const rows = documents.map((document) => {
      const json = JSON.stringify(document);

      if (json.length > 4000) throw badRequest("A document entry is too large.");

      return json;
    });

    await withTransaction(async (tx) => {
      await tx.query("DELETE FROM patient_document WHERE patient_id = ?", [patientId]);

      for (const json of rows) {
        await tx.query("INSERT INTO patient_document (patient_id, data) VALUES (?, ?)", [patientId, json]);
      }
    });

    res.json({ documents: (await loadDocuments({ patientId }))[patientId] || [] });
  })
);
