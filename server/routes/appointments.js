import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { loadAppointment } from "../data.js";
import { query, queryOne } from "../db.js";
import {
  DATE_KEY,
  badRequest,
  conflict,
  forbidden,
  hhmm,
  intId,
  notFound,
  oneOf,
  route,
  text,
  timeValue,
  todayKey,
} from "../util.js";

const router = Router();
router.use(requireAuth);

const STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_MINUTES = 30;

const minutes = (time) => {
  const [h, m] = hhmm(time).split(":").map(Number);

  return h * 60 + m;
};

const isDuplicate = (error) => error?.code === "ER_DUP_ENTRY";

// The time must fall inside one of the doctor's available slots that day.
const assertDoctorWorks = async (doctorUserId, date, time) => {
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const slots = await query(
    `SELECT start_time, end_time FROM schedule
     WHERE staff_id = ? AND work_day = ? AND status = 'Available'`,
    [doctorUserId, weekday]
  );
  const start = minutes(time);
  const fits = slots.some((slot) => start >= minutes(slot.start_time) && start + SLOT_MINUTES <= minutes(slot.end_time));

  if (!fits) throw badRequest("The doctor is not available at that time.");
};

router.post(
  "/",
  requireRole("patient", "admin"),
  route(async (req, res) => {
    const body = req.body || {};
    const patientId = req.user.role === "patient" ? req.user.id : intId(body.patientId, "Patient");
    const date = String(body.date || "");
    const time = timeValue(body.time);
    const reason = text(body.reason, { field: "Reason", required: true, max: 255 });
    const symptoms = text(body.symptoms, { field: "Symptoms", max: 1000 });

    if (!DATE_KEY.test(date)) throw badRequest("Date must be YYYY-MM-DD.");
    if (date < todayKey()) throw badRequest("The appointment date cannot be in the past.");

    const doctor = await queryOne(
      `SELECT d.user_id FROM doctor d JOIN users u ON u.user_id = d.user_id
       WHERE d.slug = ? AND u.status = 'Active'`,
      [String(body.doctorId || "")]
    );

    if (!doctor) throw badRequest("Choose a valid doctor.");

    if (!(await queryOne("SELECT 1 AS ok FROM patient WHERE user_id = ?", [patientId]))) {
      throw badRequest("Patient not found.");
    }

    await assertDoctorWorks(doctor.user_id, date, time);

    try {
      const { insertId } = await query(
        `INSERT INTO appointment (patient_id, doctor_id, appointment_date, appointment_time, status, note, symptoms)
         VALUES (?, ?, ?, ?, 'Pending', ?, ?)`,
        [patientId, doctor.user_id, date, time, reason, symptoms]
      );

      res.status(201).json({ appointment: await loadAppointment(insertId) });
    } catch (error) {
      if (isDuplicate(error)) throw conflict("That time was just booked. Please choose another.");
      throw error;
    }
  })
);

router.patch(
  "/:id",
  route(async (req, res) => {
    const id = intId(req.params.id);
    const current = await queryOne(
      `SELECT patient_id, doctor_id, status, appointment_date, appointment_time FROM appointment WHERE appointment_id = ?`,
      [id]
    );

    if (!current) throw notFound("Appointment not found.");

    const { role } = req.user;
    const isOwnerPatient = role === "patient" && current.patient_id === req.user.id;
    const isOwnerDoctor = role === "doctor" && current.doctor_id === req.user.id;
    const isManager = role === "admin" || role === "medical_staff";

    if (!isOwnerPatient && !isOwnerDoctor && !isManager) throw forbidden();

    if (["Completed", "Cancelled"].includes(current.status) && role !== "admin") {
      throw conflict(`This appointment is already ${current.status.toLowerCase()}.`);
    }

    const body = req.body || {};
    const sets = [];
    const values = [];
    let { appointment_date: date, appointment_time: time } = current;
    let status = current.status;

    if (body.status !== undefined) {
      status = oneOf(body.status, STATUSES, "Status");

      if (isOwnerPatient && !["Cancelled", "Pending"].includes(status)) {
        throw forbidden("Patients can only cancel or reschedule appointments.");
      }
    }

    const reschedules = body.date !== undefined || body.time !== undefined;

    if (reschedules) {
      if (role === "doctor" && !isOwnerDoctor) throw forbidden();

      date = body.date !== undefined ? String(body.date) : date;
      time = body.time !== undefined ? timeValue(body.time) : time;

      if (!DATE_KEY.test(date)) throw badRequest("Date must be YYYY-MM-DD.");
      if (date < todayKey()) throw badRequest("The new date cannot be in the past.");

      await assertDoctorWorks(current.doctor_id, date, time);
      sets.push("appointment_date = ?", "appointment_time = ?");
      values.push(date, time);
    }

    if (status !== current.status) {
      sets.push("status = ?");
      values.push(status);
    }

    if (body.reason !== undefined && !isOwnerPatient) {
      sets.push("note = ?");
      values.push(text(body.reason, { field: "Reason", required: true, max: 255 }));
    }

    if (body.symptoms !== undefined && (isOwnerDoctor || isManager)) {
      sets.push("symptoms = ?");
      values.push(text(body.symptoms, { field: "Symptoms", max: 1000 }));
    }

    if (sets.length) {
      try {
        await query(`UPDATE appointment SET ${sets.join(", ")} WHERE appointment_id = ?`, [...values, id]);
      } catch (error) {
        if (isDuplicate(error)) throw conflict("That time was just booked. Please choose another.");
        throw error;
      }
    }

    res.json({ appointment: await loadAppointment(id) });
  })
);

export default router;
