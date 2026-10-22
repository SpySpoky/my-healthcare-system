// Writes server/db/demo-data.json from the front end's demo dataset
// (src/data/*.js), so the database starts with the data the app has
// always shown. Dates are stored as day offsets from "today" and
// turned into real dates when the database is seeded.
//
// Run:  npm run db:export   (bundled first, see package.json)

import { writeFileSync } from "node:fs";
import { loadActivity, loadApplications, loadFeedback, loadUsers } from "../../src/data/adminData";
import { loadAppointments } from "../../src/data/appointmentData";
import { loadClinicalRecord } from "../../src/data/clinicalData";
import { DOCTORS, getDoctorById, getDoctorByName, loadAvailability } from "../../src/data/doctorsData";
import { loadPatients } from "../../src/data/patientsData";
import { installDemoData } from "../../src/test/fixtures/demoData";
import { getTodayDate, parseDate } from "../../src/utils/date";

// The app has no demo data of its own; the fixtures hold the dataset
// that becomes the database seed.
installDemoData();

const OUTPUT = "server/db/demo-data.json"; // run from the project root
const DAY_MS = 24 * 60 * 60 * 1000;
const today = parseDate(getTodayDate());
const NO_DEPARTMENT = ["General", "Administration", "—", undefined, null];

// A date key, short date or Date as whole days from today.
const offset = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : parseDate(value);
  date.setHours(0, 0, 0, 0);

  return Math.round((date - today) / DAY_MS);
};

const blank = (value) => (value === "—" || value === "" || value === undefined ? null : value);

const users = loadUsers();
const patients = loadPatients();
const patientEmail = (id) => patients.find((p) => p.id === Number(id)).email;
const emailByName = (name) => users.find((u) => u.name === name)?.email ?? null;

const staffTypeOf = (user) =>
  user.role === "doctor" ? "doctor" : user.name.startsWith("Nurse") ? "nurse" : "technician";

const licence = (prefix, index) => `${prefix}-TR-${String(100100 + index + 1)}`;

const feedback = loadFeedback();
const applications = loadApplications();

const departments = [
  ...new Set(
    [
      ...DOCTORS.map((d) => d.department),
      ...users.map((u) => u.department),
      ...applications.map((a) => a.department),
      ...feedback.map((f) => f.department),
    ].filter((name) => !NO_DEPARTMENT.includes(name))
  ),
].sort();

let nurseIndex = 0;

const data = {
  departments,

  users: users.map((user) => {
    const patient = user.role === "patient" ? patients.find((p) => p.email === user.email) : null;
    const doctor = user.role === "doctor" ? DOCTORS.find((d) => d.email === user.email) : null;
    const staffType = user.role === "doctor" || user.role === "medical_staff" ? staffTypeOf(user) : null;

    return {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      department: NO_DEPARTMENT.includes(user.department) ? null : user.department,
      joined: offset(user.joined),
      lastLogin: offset(user.lastLogin),
      dateOfBirth: patient?.dateOfBirth ?? null,
      staffType,
      slug: doctor?.id ?? null,
      specialty: doctor?.specialty ?? null,
      license:
        staffType === "doctor"
          ? licence("MD", DOCTORS.findIndex((d) => d.email === user.email))
          : staffType === "nurse"
            ? licence("RN", nurseIndex++)
            : null,
    };
  }),

  patients: patients.map((p) => ({
    email: p.email,
    gender: p.gender,
    bloodType: p.bloodType,
    allergies: p.allergies,
    address: p.address,
    emergencyContactName: p.emergencyContactName,
    emergencyContactPhone: p.emergencyContactPhone,
  })),

  availability: Object.fromEntries(DOCTORS.map((d) => [d.id, loadAvailability(d.id)])),

  appointments: loadAppointments().map((a) => ({
    patientEmail: patientEmail(a.patientId),
    doctorSlug: a.doctorId,
    day: offset(a.date),
    time: a.time,
    reason: a.reason,
    symptoms: a.symptoms,
    status: a.status,
  })),

  // Entries with the same date and doctor belong to one visit.
  records: patients.map((patient) => {
    const record = loadClinicalRecord(patient.id);
    const visits = new Map();
    const visit = (date, doctor) => {
      const key = `${date}|${doctor}`;
      if (!visits.has(key)) visits.set(key, { day: offset(date), doctorSlug: getDoctorByName(doctor).id, prescriptions: [] });
      return visits.get(key);
    };

    record.medicalHistory.forEach((h) => Object.assign(visit(h.date, h.doctor), { title: h.title, note: h.description }));
    record.diagnoses.forEach((d) =>
      Object.assign(visit(d.date, d.doctor), { diagnosis: d.diagnosis, treatment: d.notes, diagnosisStatus: d.status })
    );
    record.notes.forEach((n) => Object.assign(visit(n.date, n.doctor), { doctorNote: n.note }));
    record.prescriptions.forEach((p) =>
      visit(p.date, p.doctor).prescriptions.push({
        medication: p.medication,
        dosage: p.dosage,
        instruction: p.instructions,
        day: offset(p.date),
        frequency: p.frequency,
        duration: p.duration,
        status: p.status,
      })
    );

    return {
      patientEmail: patient.email,
      visits: [...visits.values()].sort((a, b) => a.day - b.day),
      vitals: record.vitals && { ...record.vitals, day: offset(record.vitals.recordedAt) },
    };
  }),

  // The front end has no lab-test data; these sample rows keep the ERD's LAB_TEST table populated.
  labTests: [
    [1, "sarah-johnson", "Lipid panel", "Cholesterol and triglycerides", -24, "LDL 3.1 mmol/L (borderline high)", "Completed"],
    [1, "sarah-johnson", "ECG", "Resting 12-lead ECG", -24, "Normal sinus rhythm", "Completed"],
    [1, "michael-smith", "Complete blood count", "Fatigue work-up", -90, "Within normal limits", "Completed"],
    [2, "sarah-johnson", "Holter monitor", "24-hour ECG recording", -13, null, "In Progress"],
    [4, "michael-smith", "Chest X-ray", "Persistent cough", -12, "Clear lung fields", "Completed"],
    [3, "james-anderson", "Lumbar spine X-ray", "Lower back pain", -11, "No fracture or disc narrowing", "Completed"],
    [9, "anna-martin", "Nerve conduction study", "Numbness in hands", 5, null, "Requested"],
  ].map(([patientId, doctorSlug, name, description, day, result, status]) => ({
    patientEmail: patientEmail(patientId),
    doctorSlug,
    name,
    description,
    day,
    result,
    status,
  })),

  feedback: feedback
    .slice()
    .reverse() // oldest first, so ids count up
    .map((f) => ({
      patientEmail: patientEmail(f.patientId),
      doctorSlug: getDoctorByName(f.doctor)?.id ?? null,
      department: NO_DEPARTMENT.includes(f.department) ? null : f.department,
      type: f.type,
      subject: f.subject,
      message: f.message,
      rating: f.rating,
      priority: f.priority,
      status: f.status,
      submittedDay: offset(f.submittedAt),
      response: f.response ?? null,
      respondedDay: offset(f.respondedAt),
      responderEmail: emailByName(f.respondedBy),
    })),

  applications: applications.map((a) => ({
    name: a.name,
    email: a.email,
    phone: a.phone,
    role: a.role,
    department: NO_DEPARTMENT.includes(a.department) ? null : a.department,
    licenseNumber: blank(a.licenseNumber),
    experience: a.experience,
    qualification: a.qualification,
    documents: a.documents,
    submittedDay: offset(a.submittedAt),
    status: a.status,
    reviewedDay: offset(a.reviewedAt),
    reviewerEmail: emailByName(a.reviewedBy),
    reviewNote: a.reviewNote ?? null,
  })),

  activity: loadActivity()
    .slice()
    .reverse() // oldest first
    .map((entry) => {
      const date = new Date(entry.timestamp);

      return {
        userEmail: emailByName(entry.user),
        user: entry.user,
        role: blank(entry.role),
        action: entry.action,
        module: entry.module,
        status: entry.status,
        ip: entry.ip,
        day: offset(date),
        time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      };
    }),
};

// Doctors listed in the front end must all exist as users.
DOCTORS.forEach((doctor) => {
  if (!getDoctorById(doctor.id) || !data.users.some((u) => u.email === doctor.email)) {
    throw new Error(`Doctor ${doctor.id} is missing from the user list.`);
  }
});

writeFileSync(OUTPUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${OUTPUT}`);
