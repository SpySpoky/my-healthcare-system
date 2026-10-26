// Reads from the database in the shapes the React app expects
// (the same objects src/data/*.js used to build from mock data).

import { query } from "./db.js";
import { ROLE_SQL } from "./auth.js";
import { toStoredDocument } from "./uploads.js";
import {
  activityRef,
  applicationRef,
  feedbackRef,
  hhmm,
  isoTimestamp,
  shortDate,
  timeLabel,
  UNASSIGNED,
  userRef,
} from "./util.js";

/* ---------- users ---------- */

export const loadUsers = async () => {
  const rows = await query(
    `SELECT u.user_id, u.full_name, u.email, u.phone, u.status, u.created_at, u.last_login,
            ${ROLE_SQL} AS role, d.dept_name
     FROM users u
     LEFT JOIN staff s ON s.user_id = u.user_id
     LEFT JOIN department d ON d.dept_id = s.dept_id
     ORDER BY u.user_id`
  );

  return rows.map((row) => ({
    id: userRef(row.user_id),
    name: row.full_name,
    email: row.email,
    phone: row.phone || "",
    role: row.role,
    department: row.dept_name || (row.role === "admin" ? "Administration" : "—"),
    status: row.status,
    joined: shortDate(row.created_at),
    lastLogin: row.last_login ? shortDate(row.last_login) : "Never",
  }));
};

/* ---------- patients ---------- */

const patientSelect = `SELECT p.user_id, u.full_name, u.email, u.phone, u.date_of_birth, u.status,
       p.gender, p.blood_group, p.allergies, p.address,
       p.emergency_contact_name, p.emergency_contact_phone
FROM patient p JOIN users u ON u.user_id = p.user_id`;

const toPatient = (row) => ({
  id: row.user_id,
  name: row.full_name,
  email: row.email,
  phone: row.phone || "",
  gender: row.gender || "",
  dateOfBirth: row.date_of_birth || "",
  bloodType: row.blood_group || "Unknown",
  allergies: row.allergies || "None recorded",
  address: row.address || "",
  emergencyContactName: row.emergency_contact_name || "",
  emergencyContactPhone: row.emergency_contact_phone || "",
  status: row.status === "Active" ? "Active" : "Inactive",
});

export const loadPatients = async ({ onlyId } = {}) => {
  const rows = onlyId
    ? await query(`${patientSelect} WHERE p.user_id = ?`, [onlyId])
    : await query(`${patientSelect} ORDER BY p.user_id`);

  return rows.map(toPatient);
};

/* ---------- doctors & availability ---------- */

export const loadDoctors = async () => {
  const rows = await query(
    `SELECT d.user_id, d.slug, d.specialization, u.full_name, u.email, u.phone, dep.dept_name
     FROM doctor d
     JOIN users u ON u.user_id = d.user_id
     JOIN staff s ON s.user_id = d.user_id
     LEFT JOIN department dep ON dep.dept_id = s.dept_id
     WHERE u.status = 'Active'
     ORDER BY d.user_id`
  );

  return rows.map((row) => ({
    id: row.slug,
    name: row.full_name,
    department: row.dept_name || UNASSIGNED,
    email: row.email,
    specialty: row.specialization,
    phone: row.phone || "",
  }));
};

// Every department in the clinic, by name.
export const loadDepartments = async () =>
  (await query("SELECT dept_name FROM department ORDER BY dept_name")).map((row) => row.dept_name);

export const loadAvailability = async () => {
  const rows = await query(
    `SELECT d.slug, sc.schedule_no, sc.work_day, sc.start_time, sc.end_time, sc.status
     FROM schedule sc JOIN doctor d ON d.user_id = sc.staff_id
     ORDER BY d.user_id, sc.schedule_no`
  );
  const result = {};

  rows.forEach((row) => {
    (result[row.slug] ||= []).push({
      id: row.schedule_no,
      day: row.work_day,
      startTime: hhmm(row.start_time),
      endTime: hhmm(row.end_time),
      status: row.status,
    });
  });

  return result;
};

/* ---------- appointments ---------- */

const appointmentSelect = `SELECT a.appointment_id, a.patient_id, pu.full_name AS patient,
       d.slug AS doctor_slug, du.full_name AS doctor, dep.dept_name,
       a.appointment_date, a.appointment_time, a.note, a.symptoms, a.status
FROM appointment a
JOIN users pu ON pu.user_id = a.patient_id
JOIN doctor d ON d.user_id = a.doctor_id
JOIN users du ON du.user_id = d.user_id
JOIN staff s ON s.user_id = d.user_id
LEFT JOIN department dep ON dep.dept_id = s.dept_id`;

const toAppointment = (row) => ({
  id: row.appointment_id,
  patientId: row.patient_id,
  patient: row.patient,
  doctorId: row.doctor_slug,
  doctor: row.doctor,
  department: row.dept_name || UNASSIGNED,
  date: row.appointment_date,
  time: timeLabel(row.appointment_time),
  reason: row.note || "",
  symptoms: row.symptoms || "",
  status: row.status,
});

export const loadAppointments = async ({ patientId, doctorUserId } = {}) => {
  let where = "";
  const params = [];

  if (patientId) {
    where = "WHERE a.patient_id = ?";
    params.push(patientId);
  } else if (doctorUserId) {
    where = "WHERE a.doctor_id = ?";
    params.push(doctorUserId);
  }

  const rows = await query(
    `${appointmentSelect} ${where} ORDER BY a.appointment_date, a.appointment_time`,
    params
  );

  return rows.map(toAppointment);
};

export const loadAppointment = async (id) => {
  const rows = await query(`${appointmentSelect} WHERE a.appointment_id = ?`, [id]);

  return rows[0] ? toAppointment(rows[0]) : null;
};

// Other patients' taken slots, without any patient details, so the
// booking page can hide times that are already booked.
export const loadBusySlots = async (excludePatientId) => {
  const rows = await query(
    `SELECT a.appointment_id, d.slug, a.appointment_date, a.appointment_time
     FROM appointment a JOIN doctor d ON d.user_id = a.doctor_id
     WHERE a.status <> 'Cancelled' AND a.patient_id <> ?
       AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
    [excludePatientId]
  );

  return rows.map((row) => ({
    id: -row.appointment_id,
    patientId: null,
    patient: "",
    doctorId: row.slug,
    doctor: "",
    department: "",
    date: row.appointment_date,
    time: timeLabel(row.appointment_time),
    reason: "",
    symptoms: "",
    status: "Confirmed",
    busy: true,
  }));
};

/* ---------- clinical records ---------- */

const emptyRecord = () => ({
  medicalHistory: [],
  diagnoses: [],
  prescriptions: [],
  notes: [],
  vitals: null,
  vitalsHistory: [],
});

// Newest first, like the app expects.
const newestFirst = (a, b) => b.date.localeCompare(a.date) || b.id - a.id;

export const loadClinicalRecords = async ({ patientId } = {}) => {
  const filter = patientId ? "WHERE m.patient_id = ?" : "";
  const params = patientId ? [patientId] : [];

  const records = await query(
    `SELECT m.record_id, m.patient_id, m.record_date, m.title, m.diagnosis, m.diagnosis_status,
            m.treatment, m.note, m.doctor_note, du.full_name AS doctor, dep.dept_name
     FROM medical_record m
     JOIN users du ON du.user_id = m.doctor_id
     LEFT JOIN staff s ON s.user_id = m.doctor_id
     LEFT JOIN department dep ON dep.dept_id = s.dept_id
     ${filter}`,
    params
  );

  const prescriptions = await query(
    `SELECT m.patient_id, m.record_date, rx.record_id, rx.prescription_no, rx.medication_name,
            rx.dosage, rx.instruction, rx.issue_date, rx.frequency, rx.duration, rx.status,
            du.full_name AS doctor, dep.dept_name
     FROM prescription rx
     JOIN medical_record m ON m.record_id = rx.record_id
     JOIN users du ON du.user_id = m.doctor_id
     LEFT JOIN staff s ON s.user_id = m.doctor_id
     LEFT JOIN department dep ON dep.dept_id = s.dept_id
     ${filter}`,
    params
  );

  const vitals = await query(
    `SELECT v.vital_id, v.patient_id, v.recorded_at, v.heart_rate, v.blood_pressure,
            v.temperature, v.oxygen, v.weight, ru.full_name AS recorded_by
     FROM vital_signs v
     LEFT JOIN users ru ON ru.user_id = v.recorded_by
     ${patientId ? "WHERE v.patient_id = ?" : ""}
     ORDER BY v.recorded_at, v.vital_id`,
    params
  );

  const result = {};
  const recordFor = (id) => (result[id] ||= emptyRecord());
  const department = (row) => ({ doctor: row.doctor, department: row.dept_name || UNASSIGNED });

  records.forEach((row) => {
    const record = recordFor(row.patient_id);
    const base = { id: row.record_id, date: row.record_date, ...department(row) };

    if (row.title) {
      record.medicalHistory.push({ ...base, title: row.title, description: row.note || "" });
    }

    if (row.diagnosis) {
      record.diagnoses.push({
        ...base,
        diagnosis: row.diagnosis,
        notes: row.treatment || "",
        status: row.diagnosis_status || "Active",
      });
    }

    if (row.doctor_note) {
      record.notes.push({ ...base, note: row.doctor_note });
    }
  });

  prescriptions.forEach((row) => {
    recordFor(row.patient_id).prescriptions.push({
      id: row.record_id * 1000 + row.prescription_no,
      date: row.issue_date,
      medication: row.medication_name,
      dosage: row.dosage,
      frequency: row.frequency || "",
      duration: row.duration || "",
      instructions: row.instruction || "",
      status: row.status,
      ...department(row),
    });
  });

  vitals.forEach((row) => {
    const reading = {
      id: row.vital_id,
      heartRate: row.heart_rate === null ? "" : String(row.heart_rate),
      bloodPressure: row.blood_pressure || "",
      temperature: row.temperature === null ? "" : String(Number(row.temperature)),
      oxygen: row.oxygen === null ? "" : String(row.oxygen),
      weight: row.weight === null ? "" : String(Number(row.weight)),
      recordedAt: row.recorded_at,
      recordedBy: row.recorded_by || "",
    };
    const record = recordFor(row.patient_id);

    // The list is ordered oldest to newest, so the last row wins and
    // the history ends up newest first.
    record.vitals = reading;
    record.vitalsHistory.unshift(reading);
  });

  Object.values(result).forEach((record) => {
    ["medicalHistory", "diagnoses", "prescriptions", "notes"].forEach((section) =>
      record[section].sort(newestFirst)
    );
  });

  return result;
};

/* ---------- feedback ---------- */

const feedbackSelect = `SELECT f.feedback_id, f.patient_id, pu.full_name AS patient, f.type, f.subject, f.message,
       f.rating, f.priority, f.status, f.submitted_at, f.response, f.responded_at,
       du.full_name AS doctor, dep.dept_name, ru.full_name AS responder
FROM feedback f
JOIN users pu ON pu.user_id = f.patient_id
LEFT JOIN users du ON du.user_id = f.doctor_id
LEFT JOIN department dep ON dep.dept_id = f.dept_id
LEFT JOIN users ru ON ru.user_id = f.responded_by`;

const toFeedback = (row) => ({
  id: feedbackRef(row.feedback_id),
  patientId: row.patient_id,
  patient: row.patient,
  type: row.type,
  subject: row.subject,
  message: row.message,
  rating: row.rating,
  doctor: row.doctor || "—",
  department: row.dept_name || "General",
  submittedAt: shortDate(row.submitted_at),
  status: row.status,
  priority: row.priority,
  ...(row.response && {
    response: row.response,
    respondedAt: shortDate(row.responded_at),
    respondedBy: row.responder || undefined,
  }),
});

export const loadFeedback = async ({ patientId, doctorUserId } = {}) => {
  let where = "";
  const params = [];

  if (patientId) {
    where = "WHERE f.patient_id = ?";
    params.push(patientId);
  } else if (doctorUserId) {
    where = "WHERE f.doctor_id = ?";
    params.push(doctorUserId);
  }

  const rows = await query(`${feedbackSelect} ${where} ORDER BY f.feedback_id DESC`, params);

  return rows.map(toFeedback);
};

export const loadFeedbackItem = async (id) => {
  const rows = await query(`${feedbackSelect} WHERE f.feedback_id = ?`, [id]);

  return rows[0] ? toFeedback(rows[0]) : null;
};

/* ---------- applications ---------- */

const applicationSelect = `SELECT a.application_id, a.full_name, a.email, a.phone, a.role, dep.dept_name,
       a.license_number, a.experience_years, a.qualification, a.submitted_at,
       a.status, a.reviewed_at, a.review_note, ru.full_name AS reviewer
FROM staff_application a
LEFT JOIN department dep ON dep.dept_id = a.dept_id
LEFT JOIN users ru ON ru.user_id = a.reviewed_by`;

const toApplication = (row) => ({
  id: applicationRef(row.application_id),
  name: row.full_name,
  email: row.email,
  phone: row.phone || "",
  role: row.role,
  department: row.dept_name || "—",
  licenseNumber: row.license_number || "—",
  experience: row.experience_years ?? 0,
  qualification: row.qualification || "",
  submittedAt: shortDate(row.submitted_at),
  documents: row.documents || [],
  status: row.status,
  ...(row.status !== "Pending" && {
    reviewedAt: shortDate(row.reviewed_at),
    reviewedBy: row.reviewer || undefined,
    reviewNote: row.review_note || "",
  }),
});

export const loadApplications = async () => {
  const rows = await query(`${applicationSelect} ORDER BY a.application_id DESC`);
  const documents = await query(
    `SELECT application_id, document_no, file_name, mime_type, byte_size,
            content IS NOT NULL AS has_file
     FROM application_document
     ORDER BY application_id, document_no`
  );

  const byApplication = new Map();

  documents.forEach((row) => {
    if (!byApplication.has(row.application_id)) byApplication.set(row.application_id, []);
    byApplication.get(row.application_id).push(toStoredDocument(row));
  });

  return rows.map((row) =>
    toApplication({ ...row, documents: byApplication.get(row.application_id) || [] })
  );
};

/* ---------- activity ---------- */

export const loadActivity = async ({ userId, limit = 500 } = {}) => {
  const rows = await query(
    `SELECT log_id, user_name, role, action, module, status, ip_address, created_at
     FROM activity_log ${userId ? "WHERE user_id = ?" : ""}
     ORDER BY created_at DESC, log_id DESC LIMIT ?`,
    userId ? [userId, limit] : [limit]
  );

  return rows.map((row) => ({
    id: activityRef(row.log_id),
    user: row.user_name,
    role: row.role || "—",
    action: row.action,
    module: row.module,
    status: row.status,
    ip: row.ip_address || "—",
    timestamp: isoTimestamp(row.created_at),
  }));
};

/* ---------- patient documents ---------- */

// Newest first, the way the profile page lists them. The file itself
// is never loaded here, only its description.
export const loadDocuments = async ({ patientId } = {}) => {
  const rows = await query(
    `SELECT document_id, patient_id, doc_type, file_name, mime_type, byte_size,
            created_at, content IS NOT NULL AS has_file
     FROM patient_document
     ${patientId ? "WHERE patient_id = ?" : ""}
     ORDER BY created_at DESC, document_id DESC`,
    patientId ? [patientId] : []
  );
  const result = {};

  rows.forEach((row) => {
    (result[row.patient_id] ||= []).push({
      ...toStoredDocument(row),
      category: row.doc_type,
      uploadedAt: isoTimestamp(row.created_at),
    });
  });

  return result;
};

/* ---------- report statistics ---------- */

export const loadReportStats = async () => {
  const [monthRows, statusRows, departmentRows] = await Promise.all([
    query(
      `SELECT DATE_FORMAT(m.month_start, '%Y-%m') AS ym, DATE_FORMAT(m.month_start, '%b') AS label,
              (SELECT COUNT(*) FROM appointment a
                 WHERE a.appointment_date >= m.month_start
                   AND a.appointment_date < DATE_ADD(m.month_start, INTERVAL 1 MONTH)) AS appointments,
              (SELECT COUNT(*) FROM users u
                 WHERE u.created_at >= m.month_start
                   AND u.created_at < DATE_ADD(m.month_start, INTERVAL 1 MONTH)) AS registrations,
              (SELECT COUNT(*) FROM feedback f
                 WHERE f.submitted_at >= m.month_start
                   AND f.submitted_at < DATE_ADD(m.month_start, INTERVAL 1 MONTH)) AS feedback
       FROM (
         SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL n MONTH) AS month_start
         FROM (SELECT 5 AS n UNION SELECT 4 UNION SELECT 3 UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) months
       ) m
       ORDER BY m.month_start`
    ),
    query(
      `SELECT CASE
                WHEN status = 'Cancelled' THEN 'Cancelled'
                WHEN status = 'Completed' THEN 'Completed'
                ELSE 'Upcoming'
              END AS label, COUNT(*) AS value
       FROM appointment GROUP BY label`
    ),
    query(
      `SELECT dep.dept_name AS label, COUNT(*) AS value
       FROM appointment a
       JOIN staff s ON s.user_id = a.doctor_id
       JOIN department dep ON dep.dept_id = s.dept_id
       GROUP BY dep.dept_name ORDER BY value DESC`
    ),
  ]);

  const statusOrder = ["Completed", "Upcoming", "Cancelled"];

  return {
    monthly: monthRows.map((row) => ({
      month: row.label,
      appointments: Number(row.appointments),
      registrations: Number(row.registrations),
      feedback: Number(row.feedback),
    })),
    appointmentStatus: statusOrder.map((label) => ({
      label,
      value: Number(statusRows.find((row) => row.label === label)?.value || 0),
    })),
    departments: departmentRows.map((row) => ({ label: row.label, value: Number(row.value) })),
  };
};
