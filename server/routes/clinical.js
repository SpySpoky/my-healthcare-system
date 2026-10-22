// Clinical records (written by doctors) and doctor availability.

import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { loadClinicalRecords } from "../data.js";
import { queryOne, withTransaction } from "../db.js";
import {
  DATE_KEY,
  badRequest,
  forbidden,
  intId,
  notFound,
  oneOf,
  route,
  text,
  todayKey,
} from "../util.js";

export const recordsRouter = Router();
export const doctorsRouter = Router();

recordsRouter.use(requireAuth);
doctorsRouter.use(requireAuth);

const entryDate = (value) => {
  const date = String(value || todayKey());

  if (!DATE_KEY.test(date)) throw badRequest("Date must be YYYY-MM-DD.");
  if (date > todayKey()) throw badRequest("The date cannot be in the future.");

  return date;
};

const emptyRecord = { medicalHistory: [], diagnoses: [], prescriptions: [], notes: [], vitals: null };

// Each new entry is stored as its own medical_record row; the app
// shows the rows as separate history / diagnosis / note / prescription lists.
const SECTIONS = {
  medicalHistory: (body) => ({
    title: text(body.title, { field: "Title", required: true, max: 150 }),
    note: text(body.description, { field: "Description", required: true, max: 2000 }),
  }),
  diagnoses: (body) => ({
    diagnosis: text(body.diagnosis, { field: "Diagnosis", required: true, max: 2000 }),
    treatment: text(body.notes, { field: "Clinical notes", required: true, max: 2000 }),
    diagnosis_status: body.status ? oneOf(body.status, ["Active", "Resolved"], "Status") : "Active",
  }),
  notes: (body) => ({
    doctor_note: text(body.note, { field: "Note", required: true, max: 2000 }),
  }),
};

recordsRouter.get(
  "/:id/record",
  route(async (req, res) => {
    const patientId = intId(req.params.id, "Patient");
    const { role, id } = req.user;

    if (role === "patient" && id !== patientId) throw forbidden();
    if (role === "admin") throw forbidden("Administrators cannot view clinical records.");

    const records = await loadClinicalRecords({ patientId });

    res.json({ record: records[patientId] || emptyRecord });
  })
);

recordsRouter.post(
  "/:id/record/:section",
  requireRole("doctor"),
  route(async (req, res) => {
    const patientId = intId(req.params.id, "Patient");
    const { section } = req.params;
    const body = req.body || {};

    if (!(await queryOne("SELECT 1 AS ok FROM patient WHERE user_id = ?", [patientId]))) {
      throw notFound("Patient not found.");
    }

    const date = entryDate(body.date);

    await withTransaction(async (tx) => {
      if (section === "prescriptions") {
        const { insertId } = await tx.query(
          "INSERT INTO medical_record (patient_id, doctor_id, record_date) VALUES (?, ?, ?)",
          [patientId, req.user.id, date]
        );

        await tx.query(
          `INSERT INTO prescription
             (record_id, prescription_no, medication_name, dosage, instruction, issue_date, frequency, duration, status)
           VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'Active')`,
          [
            insertId,
            text(body.medication, { field: "Medication", required: true, max: 150 }),
            text(body.dosage, { field: "Dosage", required: true, max: 100 }),
            text(body.instructions, { field: "Instructions", max: 2000 }),
            date,
            text(body.frequency, { field: "Frequency", max: 100 }),
            text(body.duration, { field: "Duration", max: 50 }),
          ]
        );

        return;
      }

      const build = SECTIONS[section];

      if (!build) throw badRequest("Unknown record section.");

      const fields = build(body);
      const columns = Object.keys(fields);

      await tx.query(
        `INSERT INTO medical_record (patient_id, doctor_id, record_date, ${columns.join(", ")})
         VALUES (?, ?, ?, ${columns.map(() => "?").join(", ")})`,
        [patientId, req.user.id, date, ...columns.map((column) => fields[column])]
      );
    });

    const records = await loadClinicalRecords({ patientId });

    res.status(201).json({ record: records[patientId] || emptyRecord });
  })
);

/* ---------- availability ---------- */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

doctorsRouter.put(
  "/:slug/availability",
  requireRole("doctor", "admin"),
  route(async (req, res) => {
    const doctor = await queryOne("SELECT user_id FROM doctor WHERE slug = ?", [req.params.slug]);

    if (!doctor) throw notFound("Doctor not found.");
    if (req.user.role === "doctor" && doctor.user_id !== req.user.id) throw forbidden();

    const slots = req.body?.slots;

    if (!Array.isArray(slots) || slots.length > 100) throw badRequest("slots must be a list of at most 100 items.");

    const clean = slots.map((slot) => {
      if (!TIME_24H.test(slot.startTime) || !TIME_24H.test(slot.endTime)) {
        throw badRequest("Times must be HH:MM.");
      }

      if (slot.endTime <= slot.startTime) throw badRequest("The end time must be after the start time.");

      return {
        day: oneOf(slot.day, DAYS, "Day"),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: oneOf(slot.status || "Available", ["Available", "Unavailable"], "Status"),
      };
    });

    // Slots on the same day must not overlap.
    clean.forEach((slot, index) =>
      clean.slice(index + 1).forEach((other) => {
        if (slot.day === other.day && slot.startTime < other.endTime && other.startTime < slot.endTime) {
          throw badRequest(`Slots on ${slot.day} overlap.`);
        }
      })
    );

    await withTransaction(async (tx) => {
      await tx.query("DELETE FROM schedule WHERE staff_id = ?", [doctor.user_id]);

      for (const [index, slot] of clean.entries()) {
        await tx.query(
          `INSERT INTO schedule (staff_id, schedule_no, work_day, start_time, end_time, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [doctor.user_id, index + 1, slot.day, `${slot.startTime}:00`, `${slot.endTime}:00`, slot.status]
        );
      }
    });

    res.json({ slots: clean.map((slot, index) => ({ id: index + 1, ...slot })) });
  })
);
