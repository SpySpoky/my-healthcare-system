// Demo dataset used by the tests and by `npm run db:export` (which writes
// server/db/demo-data.json, the seed for the MySQL database). The app itself
// contains no demo data: doctors, departments and everything else are
// loaded from the database.
//
// Dates are generated relative to today so "today's schedule" is never empty.

import {
  APPOINTMENT_STATUS_STATS,
  CURRENT_ADMIN,
  DEPARTMENT_STATS,
  MONTHLY_STATS,
} from "../../data/adminData";
import { registerDemoData } from "../../data/demoRegistry";
import { DOCTORS, getDoctorById, setDepartments, setDoctors } from "../../data/doctorsData";
import { loadPatients } from "../../data/patientsData";
import { formatShortDate, getRelativeDate } from "../../utils/date";

/* =====================================================
   DOCTORS
   Dr. Sarah Johnson is the demo doctor account (doctor@test.com).
===================================================== */

export const DEMO_DOCTORS = [
  { id: "sarah-johnson", name: "Dr. Sarah Johnson", department: "Cardiology", email: "doctor@test.com" },
  { id: "michael-smith", name: "Dr. Michael Smith", department: "General Medicine", email: "michael.smith@healthcare.test" },
  { id: "emily-brown", name: "Dr. Emily Brown", department: "Dermatology", email: "emily.brown@healthcare.test" },
  { id: "david-wilson", name: "Dr. David Wilson", department: "General Medicine", email: "david.wilson@healthcare.test" },
  { id: "anna-martin", name: "Dr. Anna Martin", department: "Neurology", email: "anna.martin@healthcare.test" },
  { id: "james-anderson", name: "Dr. James Anderson", department: "Orthopedics", email: "james.anderson@healthcare.test" },
].map((doctor, index) => ({
  ...doctor,
  specialty: `${doctor.department} Specialist`,
  phone: `+90 555 70${index} 11${index}${index}`,
}));

const WEEKDAY_SCHEDULE = [
  ["Monday", "09:00", "12:00"],
  ["Monday", "14:00", "17:00"],
  ["Tuesday", "09:00", "13:00"],
  ["Tuesday", "14:00", "17:00"],
  ["Wednesday", "10:00", "13:00"],
  ["Thursday", "09:00", "12:00"],
  ["Thursday", "14:00", "17:00"],
  ["Friday", "09:00", "13:00"],
];

const createAvailability = () =>
  Object.fromEntries(
    DOCTORS.map((doctor, doctorIndex) => [
      doctor.id,
      WEEKDAY_SCHEDULE
        // Give each doctor a slightly different week.
        .filter((_, slotIndex) => (slotIndex + doctorIndex) % 5 !== 4)
        .map(([day, startTime, endTime], slotIndex) => ({
          id: slotIndex + 1,
          day,
          startTime,
          endTime,
          status: "Available",
        })),
    ])
  );

/* =====================================================
   PATIENTS
   Patient #1 (John Smith) is the demo patient account (patient@test.com).
===================================================== */

const CITIES = ["Famagusta", "Nicosia", "Kyrenia", "Morphou", "Iskele"];

const PATIENT_SEED = [
  ["John Smith", "Male", "1984-03-15", "O+", "Penicillin", "Sarah Smith", "+90 555 987 6543", "patient@test.com", "+90 555 123 4567"],
  ["Emily Johnson", "Female", "1991-07-02", "A+", "None known", "Mark Johnson", "+90 555 876 5432"],
  ["Michael Brown", "Male", "1975-01-21", "B+", "Ibuprofen", "Linda Brown", "+90 555 765 4321"],
  ["Sarah Wilson", "Female", "1996-11-09", "AB+", "Pollen", "Tom Wilson", "+90 555 654 3210"],
  ["David Miller", "Male", "1979-04-30", "O-", "None known", "Anna Miller", "+90 555 543 2109"],
  ["Emma Davis", "Female", "1995-08-17", "A-", "Latex", "Chris Davis", "+90 555 432 1098"],
  ["James Taylor", "Male", "1968-06-05", "B-", "Sulfa drugs", "Mary Taylor", "+90 555 321 0987", null, null, "Inactive"],
  ["Olivia Martin", "Female", "1999-12-12", "O+", "None known", "Paul Martin", "+90 555 210 9876"],
  ["Robert Anderson", "Male", "1963-02-28", "A+", "Aspirin", "Helen Anderson", "+90 555 109 8765", null, null, "Inactive"],
  ["Sophia Thomas", "Female", "1986-10-14", "AB-", "None known", "Daniel Thomas", "+90 555 098 7654"],
  ["Daniel Jackson", "Male", "1982-05-19", "O+", "Shellfish", "Rachel Jackson", "+90 555 222 3344"],
  ["Isabella White", "Female", "1993-03-23", "B+", "None known", "Henry White", "+90 555 444 5566"],
  ["William Harris", "Male", "1971-09-08", "A+", "Codeine", "Grace Harris", "+90 555 666 7788"],
];

const createPatients = () =>
  PATIENT_SEED.map(
    ([name, gender, dateOfBirth, bloodType, allergies, contactName, contactPhone, email, phone, status], index) => {
      const id = index + 1;
      const emailName = name.toLowerCase().replace(" ", ".");

      return {
        id,
        name,
        email: email || `${emailName}@example.com`,
        phone: phone || `+90 555 ${String(100 + id * 111).slice(-3)} ${String(4000 + id * 123).slice(-4)}`,
        gender,
        dateOfBirth,
        bloodType,
        allergies,
        address: `${10 + id} Atatürk Street, ${CITIES[index % CITIES.length]}`,
        emergencyContactName: contactName,
        emergencyContactPhone: contactPhone,
        status: status || "Active",
      };
    }
  );

/* =====================================================
   APPOINTMENTS
===================================================== */

// [patientId, patientName, doctorId, dayOffset, time, reason, symptoms, status]
const APPOINTMENT_SEED = [
  [1, "John Smith", "sarah-johnson", 0, "09:00 AM", "Blood pressure review", "Occasional headaches", "Confirmed"],
  [2, "Emily Johnson", "sarah-johnson", 0, "10:30 AM", "Cardiology follow-up", "Chest discomfort during exercise", "Confirmed"],
  [3, "Michael Brown", "sarah-johnson", 0, "02:00 PM", "Consultation", "Shortness of breath", "Pending"],
  [4, "Sarah Wilson", "sarah-johnson", 0, "03:30 PM", "Medical review", "Palpitations", "Confirmed"],
  [5, "David Miller", "sarah-johnson", 1, "10:00 AM", "General consultation", "Fatigue", "Pending"],
  [6, "Emma Davis", "sarah-johnson", 2, "02:30 PM", "Follow-up examination", "Dizziness", "Confirmed"],
  [8, "Olivia Martin", "sarah-johnson", 3, "11:00 AM", "ECG review", "Irregular heartbeat", "Confirmed"],
  [10, "Sophia Thomas", "sarah-johnson", 7, "09:30 AM", "Annual heart check", "None reported", "Pending"],
  [1, "John Smith", "sarah-johnson", -24, "09:30 AM", "Heart check-up", "Routine check", "Completed"],
  [2, "Emily Johnson", "sarah-johnson", -14, "10:30 AM", "Cardiology consultation", "Chest discomfort", "Completed"],
  [11, "Daniel Jackson", "sarah-johnson", -6, "11:00 AM", "Chest pain assessment", "Chest pain after exercise", "Completed"],
  [12, "Isabella White", "sarah-johnson", -3, "02:00 PM", "Follow-up", "Mild palpitations", "Completed"],
  [13, "William Harris", "sarah-johnson", -2, "10:00 AM", "Consultation", "High blood pressure", "Cancelled"],
  [7, "James Taylor", "sarah-johnson", 4, "03:00 PM", "Medical review", "Swollen ankles", "Cancelled"],
  [1, "John Smith", "emily-brown", 2, "02:30 PM", "Skin consultation", "Itchy rash on arm", "Pending"],
  [1, "John Smith", "david-wilson", 8, "11:30 AM", "General consultation", "Follow-up on headaches", "Confirmed"],
  [1, "John Smith", "michael-smith", -16, "11:00 AM", "Follow-up consultation", "Recurring headaches", "Completed"],
  [1, "John Smith", "sarah-johnson", -31, "09:00 AM", "Heart check-up", "Routine check", "Cancelled"],
  [3, "Michael Brown", "james-anderson", -11, "02:00 PM", "Back pain review", "Lower back pain", "Completed"],
  [4, "Sarah Wilson", "michael-smith", -12, "03:30 PM", "Persistent cough", "Cough for three weeks", "Completed"],
  [9, "Robert Anderson", "anna-martin", 5, "10:00 AM", "Neurology consultation", "Numbness in hands", "Confirmed"],
  [5, "David Miller", "david-wilson", -20, "11:00 AM", "General check-up", "None reported", "Completed"],
];

const createAppointments = () =>
  APPOINTMENT_SEED.map(([patientId, patient, doctorId, offset, time, reason, symptoms, status], index) => {
    const doctor = getDoctorById(doctorId);

    return {
      id: index + 1,
      patientId,
      patient,
      doctorId,
      doctor: doctor.name,
      department: doctor.department,
      date: getRelativeDate(offset),
      time,
      reason,
      symptoms,
      status,
    };
  });

/* =====================================================
   CLINICAL RECORDS
   Day offsets are relative to today. Template 0 belongs to the demo
   patient (John Smith) and matches his past appointments.
===================================================== */

const doctorInfo = (doctorId) => {
  const doctor = getDoctorById(doctorId);

  return { doctor: doctor.name, department: doctor.department };
};

const TEMPLATES = [
  {
    history: [
      [-16, "Follow-up Consultation", "michael-smith", "Follow-up for recurring headaches. Symptoms are improving."],
      [-24, "Cardiology Check-up", "sarah-johnson", "Routine heart check-up. Blood pressure slightly elevated."],
      [-90, "Initial Consultation", "michael-smith", "Patient presented with headaches and fatigue."],
    ],
    diagnoses: [
      [-16, "Tension Headache", "michael-smith", "Mild recurring headaches. No serious symptoms reported.", "Active"],
      [-24, "Elevated Blood Pressure", "sarah-johnson", "Monitor blood pressure at home and review in clinic.", "Active"],
      [-90, "Fatigue", "michael-smith", "Improved sleep schedule and hydration recommended.", "Resolved"],
    ],
    prescriptions: [
      [-16, "Paracetamol 500mg", "1 tablet", "Every 6 hours when needed", "5 days", "Take with water after food.", "michael-smith", "Active"],
      [-90, "Vitamin D 1000 IU", "1 tablet", "Once daily", "30 days", "Take with breakfast.", "michael-smith", "Completed"],
    ],
    notes: [
      [-16, "michael-smith", "Maintain regular sleep and hydration. Return if headaches continue."],
      [-24, "sarah-johnson", "Recheck blood pressure at the next cardiology visit."],
    ],
    vitals: { heartRate: "76", bloodPressure: "132/84", temperature: "36.7", oxygen: "98", weight: "78" },
  },
  {
    history: [[-14, "Cardiology Consultation", "sarah-johnson", "Patient reported chest discomfort during exercise."]],
    diagnoses: [[-14, "Stage 1 Hypertension", "sarah-johnson", "Elevated readings on three visits. Medication started.", "Active"]],
    prescriptions: [
      [-14, "Amlodipine 5mg", "1 tablet", "Once daily", "90 days", "Take in the morning. Monitor blood pressure weekly.", "sarah-johnson", "Active"],
    ],
    notes: [[-14, "sarah-johnson", "Reduce salt intake. Review readings at the follow-up."]],
    vitals: { heartRate: "78", bloodPressure: "134/86", temperature: "36.6", oxygen: "97", weight: "68" },
  },
  {
    history: [[-11, "Orthopedic Review", "james-anderson", "Lower back pain reviewed after physiotherapy."]],
    diagnoses: [[-11, "Lumbar Muscle Strain", "james-anderson", "No neurological symptoms. Physiotherapy continued.", "Active"]],
    prescriptions: [
      [-11, "Naproxen 250mg", "1 tablet", "Twice daily", "10 days", "Take with food. Stop if stomach pain occurs.", "james-anderson", "Active"],
    ],
    notes: [[-11, "james-anderson", "Mobility improved. Continue home exercises for another month."]],
    vitals: { heartRate: "70", bloodPressure: "122/79", temperature: "36.8", oxygen: "98", weight: "82" },
  },
  {
    history: [[-12, "Respiratory Review", "michael-smith", "Persistent cough for three weeks. Chest examination performed."]],
    diagnoses: [[-12, "Acute Bronchitis", "michael-smith", "Clear chest X-ray. Rest and symptomatic treatment advised.", "Active"]],
    prescriptions: [
      [-12, "Dextromethorphan Syrup", "10 ml", "Three times daily", "7 days", "Do not exceed the stated dose.", "michael-smith", "Active"],
    ],
    notes: [[-12, "michael-smith", "Return if fever develops or the cough lasts two more weeks."]],
    vitals: { heartRate: "84", bloodPressure: "118/76", temperature: "37.4", oxygen: "96", weight: "61" },
  },
  {
    history: [[-20, "Annual Physical", "david-wilson", "Routine annual physical examination. No complaints."]],
    diagnoses: [],
    prescriptions: [],
    notes: [],
    vitals: { heartRate: "68", bloodPressure: "116/75", temperature: "36.6", oxygen: "99", weight: "70" },
  },
];

const buildRecord = (template) => {
  let nextId = 1;
  const id = () => nextId++;

  return {
    medicalHistory: template.history.map(([offset, title, doctorId, description]) => ({
      id: id(),
      date: getRelativeDate(offset),
      title,
      description,
      ...doctorInfo(doctorId),
    })),
    diagnoses: template.diagnoses.map(([offset, diagnosis, doctorId, notes, status]) => ({
      id: id(),
      date: getRelativeDate(offset),
      diagnosis,
      notes,
      status,
      ...doctorInfo(doctorId),
    })),
    prescriptions: template.prescriptions.map(
      ([offset, medication, dosage, frequency, duration, instructions, doctorId, status]) => ({
        id: id(),
        date: getRelativeDate(offset),
        medication,
        dosage,
        frequency,
        duration,
        instructions,
        status,
        ...doctorInfo(doctorId),
      })
    ),
    notes: template.notes.map(([offset, doctorId, note]) => ({
      id: id(),
      date: getRelativeDate(offset),
      note,
      ...doctorInfo(doctorId),
    })),
    vitals: { ...template.vitals, recordedAt: getRelativeDate(-1) },
  };
};

const createClinicalRecords = () =>
  Object.fromEntries(
    Array.from({ length: 13 }, (_, index) => [index + 1, buildRecord(TEMPLATES[index % TEMPLATES.length])])
  );

/* =====================================================
   USERS, APPLICATIONS, FEEDBACK, ACTIVITY
===================================================== */

const daysAgo = (days) => formatShortDate(getRelativeDate(-days));

// ISO timestamp `days` ago at the given hour and minute.
const timestampDaysAgo = (days, hour, minute) => {
  const date = new Date(`${getRelativeDate(-days)}T00:00:00`);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
};

const STAFF_AND_ADMINS = [
  ["Nurse Laura Kim", "staff@test.com", "+90 555 801 2200", "medical_staff", "Cardiology", "Active", 230, 0],
  ["Nurse Ahmet Yilmaz", "ahmet.yilmaz@healthcare.test", "+90 555 801 3300", "medical_staff", "General Medicine", "Active", 180, 1],
  ["Technician Mia Clarke", "mia.clarke@healthcare.test", "+90 555 801 4400", "medical_staff", "Radiology", "Inactive", 140, 52],
  [CURRENT_ADMIN, "admin@test.com", "+90 555 900 0001", "admin", "Administration", "Active", 280, 0],
  ["Elif Demir", "elif.demir@healthcare.test", "+90 555 900 0002", "admin", "Administration", "Active", 270, 2],
];

const createUsers = () => {
  const accounts = [
    ...loadPatients().map((patient, index) => ({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      role: "patient",
      department: "—",
      status: patient.status === "Inactive" ? "Inactive" : index === 10 ? "Suspended" : "Active",
      joined: daysAgo(250 - index * 17),
      lastLogin: patient.status === "Inactive" ? daysAgo(60) : daysAgo(index % 5),
    })),
    ...DOCTORS.map((doctor, index) => ({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      role: "doctor",
      department: doctor.department,
      status: "Active",
      joined: daysAgo(270 - index * 20),
      lastLogin: daysAgo(index % 3),
    })),
    ...STAFF_AND_ADMINS.map(([name, email, phone, role, department, status, joinedDaysAgo, lastLoginDaysAgo]) => ({
      name,
      email,
      phone,
      role,
      department,
      status,
      joined: daysAgo(joinedDaysAgo),
      lastLogin: daysAgo(lastLoginDaysAgo),
    })),
  ];

  return accounts.map((account, index) => ({
    id: `U${String(index + 1).padStart(3, "0")}`,
    ...account,
  }));
};

// Documents on the demo applications are recorded by name only: no
// file was ever uploaded for them, so they cannot be downloaded.
const docs = (...names) =>
  names.map((name, index) => ({
    id: index + 1,
    name,
    type: "application/pdf",
    size: 180_000 + index * 40_000,
    stored: false,
  }));

const createApplications = () => [
  { id: "APP-1001", name: "Dr. Hannah Lee", email: "hannah.lee@example.com", phone: "+90 555 310 1001", role: "doctor", department: "Pediatrics", licenseNumber: "MD-TR-448120", experience: 8, qualification: "MD, Pediatrics Residency — Ankara University", submittedAt: daysAgo(1), documents: docs("Medical license.pdf", "CV.pdf", "ID card.pdf"), status: "Pending" },
  { id: "APP-1002", name: "Dr. Omar Haddad", email: "omar.haddad@example.com", phone: "+90 555 310 1002", role: "doctor", department: "Neurology", licenseNumber: "MD-TR-551903", experience: 12, qualification: "MD, PhD Neurology — Hacettepe University", submittedAt: daysAgo(2), documents: docs("Medical license.pdf", "CV.pdf"), status: "Pending" },
  { id: "APP-1003", name: "Grace Okafor", email: "grace.okafor@example.com", phone: "+90 555 310 1003", role: "medical_staff", department: "Emergency", licenseNumber: "RN-TR-220781", experience: 5, qualification: "BSc Nursing — Istanbul University", submittedAt: daysAgo(3), documents: docs("Nursing license.pdf", "CV.pdf", "References.pdf"), status: "Pending" },
  { id: "APP-1004", name: "Dr. Lucas Meyer", email: "lucas.meyer@example.com", phone: "+90 555 310 1004", role: "doctor", department: "Dermatology", licenseNumber: "MD-TR-390456", experience: 3, qualification: "MD — Ege University", submittedAt: daysAgo(5), documents: docs("CV.pdf"), status: "Pending" },
  { id: "APP-1005", name: "Selin Arslan", email: "selin.arslan@example.com", phone: "+90 555 310 1005", role: "medical_staff", department: "Radiology", licenseNumber: "RT-TR-118230", experience: 6, qualification: "Radiologic Technology Diploma", submittedAt: daysAgo(8), documents: docs("Certification.pdf", "CV.pdf"), status: "Approved", reviewedAt: daysAgo(6), reviewedBy: "Elif Demir", reviewNote: "All documents verified." },
  { id: "APP-1006", name: "Dr. Victor Novak", email: "victor.novak@example.com", phone: "+90 555 310 1006", role: "doctor", department: "Orthopedics", licenseNumber: "MD-TR-207733", experience: 15, qualification: "MD, Orthopedic Surgery — Gazi University", submittedAt: daysAgo(12), documents: docs("Medical license.pdf", "CV.pdf", "ID card.pdf"), status: "Approved", reviewedAt: daysAgo(10), reviewedBy: CURRENT_ADMIN, reviewNote: "License confirmed with the medical board." },
  { id: "APP-1007", name: "Kevin Brooks", email: "kevin.brooks@example.com", phone: "+90 555 310 1007", role: "medical_staff", department: "General Medicine", licenseNumber: "—", experience: 1, qualification: "Nursing student (final year)", submittedAt: daysAgo(16), documents: docs("CV.pdf"), status: "Rejected", reviewedAt: daysAgo(14), reviewedBy: CURRENT_ADMIN, reviewNote: "A valid nursing license is required. The applicant may reapply after licensing." },
];

const createFeedback = () => [
  { id: "FB-2001", patientId: 1, patient: "John Smith", type: "Complaint", subject: "Long waiting time", message: "I waited more than 45 minutes after my appointment time before being seen by the doctor.", rating: 2, doctor: "Dr. Michael Smith", department: "General Medicine", submittedAt: daysAgo(1), status: "Open", priority: "High" },
  { id: "FB-2002", patientId: 2, patient: "Emily Johnson", type: "Feedback", subject: "Great cardiology care", message: "Dr. Johnson explained everything clearly and the follow-up was well organised.", rating: 5, doctor: "Dr. Sarah Johnson", department: "Cardiology", submittedAt: daysAgo(2), status: "Resolved", priority: "Low", response: "Thank you for your kind words. We have shared your feedback with the cardiology team.", respondedAt: daysAgo(1), respondedBy: "Elif Demir" },
  { id: "FB-2003", patientId: 4, patient: "Sarah Wilson", type: "Suggestion", subject: "SMS appointment reminders", message: "It would help to receive a text message reminder the day before an appointment.", rating: 4, doctor: "—", department: "General", submittedAt: daysAgo(3), status: "In Review", priority: "Medium" },
  { id: "FB-2004", patientId: 5, patient: "David Miller", type: "Complaint", subject: "Prescription not visible", message: "My latest prescription did not appear in my medical records for two days.", rating: 3, doctor: "Dr. David Wilson", department: "General Medicine", submittedAt: daysAgo(4), status: "Open", priority: "Medium" },
  { id: "FB-2005", patientId: 6, patient: "Emma Davis", type: "Feedback", subject: "Easy online booking", message: "Booking an appointment online was quick and simple.", rating: 5, doctor: "Dr. Emily Brown", department: "Dermatology", submittedAt: daysAgo(6), status: "Closed", priority: "Low", response: "Thank you for using the online booking system.", respondedAt: daysAgo(5), respondedBy: CURRENT_ADMIN },
  { id: "FB-2006", patientId: 8, patient: "Olivia Martin", type: "Complaint", subject: "Rude reception staff", message: "The reception staff were dismissive when I asked about my appointment time.", rating: 1, doctor: "—", department: "Reception", submittedAt: daysAgo(8), status: "In Review", priority: "High" },
  { id: "FB-2007", patientId: 10, patient: "Sophia Thomas", type: "Feedback", subject: "Helpful neurology consultation", message: "Dr. Martin took time to answer all my questions.", rating: 4, doctor: "Dr. Anna Martin", department: "Neurology", submittedAt: daysAgo(11), status: "Resolved", priority: "Low", response: "We are glad the consultation was helpful.", respondedAt: daysAgo(10), respondedBy: "Elif Demir" },
  { id: "FB-2008", patientId: 1, patient: "John Smith", type: "Suggestion", subject: "Appointment reminders", message: "It would be useful to receive appointment reminders one day before the appointment.", rating: 4, doctor: "Dr. Sarah Johnson", department: "Cardiology", submittedAt: daysAgo(20), status: "Resolved", priority: "Low", response: "Thank you for your suggestion. We are reviewing improvements to the notification system.", respondedAt: daysAgo(18), respondedBy: CURRENT_ADMIN },
];

// [user, role, action, module, status, ip, daysAgo, hour, minute]
const ACTIVITY_SEED = [
  ["Dr. Sarah Johnson", "doctor", "Logged in", "Authentication", "Success", "10.0.4.21", 0, 8, 12],
  ["John Smith", "patient", "Booked appointment with Dr. Emily Brown", "Appointments", "Success", "85.102.44.10", 0, 7, 55],
  ["Unknown", "—", "Failed login attempt for admin@test.com", "Authentication", "Failed", "203.0.113.45", 0, 7, 41],
  ["Dr. Michael Smith", "doctor", "Added diagnosis for patient #4", "Medical Records", "Success", "10.0.4.33", 1, 16, 30],
  ["Elif Demir", "admin", "Updated system notification settings", "Settings", "Success", "10.0.1.5", 1, 15, 20],
  ["Emily Johnson", "patient", "Submitted feedback FB-2002", "Feedback", "Success", "78.180.12.9", 2, 14, 2],
  ["Nurse Laura Kim", "medical_staff", "Updated vital signs for patient #2", "Medical Records", "Success", "10.0.4.50", 2, 12, 47],
  ["William Harris", "patient", "Cancelled an appointment with Dr. Sarah Johnson", "Appointments", "Warning", "88.240.7.71", 2, 11, 15],
  ["Unknown", "—", "Failed login attempt for john.smith@example.com", "Authentication", "Failed", "198.51.100.23", 3, 3, 8],
  ["Dr. Emily Brown", "doctor", "Updated weekly availability", "Appointments", "Success", "10.0.4.27", 3, 18, 40],
  ["Elif Demir", "admin", "Responded to feedback FB-2002", "Feedback", "Success", "10.0.1.5", 1, 9, 30],
  ["Sarah Wilson", "patient", "Updated profile information", "Users", "Success", "176.88.3.14", 4, 12, 5],
  ["Dr. James Anderson", "doctor", "Prescribed medication for patient #3", "Medical Records", "Success", "10.0.4.40", 11, 14, 22],
  ["Isabella White", "patient", "Password reset requested", "Authentication", "Warning", "95.70.150.2", 5, 20, 11],
  [CURRENT_ADMIN, "admin", "Approved application APP-1006", "Applications", "Success", "10.0.1.4", 10, 10, 0],
  [CURRENT_ADMIN, "admin", "Rejected application APP-1007", "Applications", "Success", "10.0.1.4", 14, 9, 45],
];

const createActivity = () =>
  ACTIVITY_SEED.map(([user, role, action, module, status, ip, days, hour, minute], index) => ({
    id: `ACT-${String(ACTIVITY_SEED.length - index).padStart(4, "0")}`,
    user,
    role,
    action,
    module,
    status,
    ip,
    timestamp: timestampDaysAgo(days, hour, minute),
  }));

/* =====================================================
   MESSAGES (used when there is no backend)
===================================================== */

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

const createMessages = () => [
  { id: 1, from: "staff@test.com", fromName: "Nurse Laura Kim", fromRole: "medical_staff", to: "patient@test.com", toName: "John Smith", toRole: "patient", subject: "Preparing for your appointment", body: "Hello John, please avoid caffeine for two hours before your appointment and bring your list of current medications.", sentAt: hoursAgo(6), readAt: null },
  { id: 2, from: "doctor@test.com", fromName: "Dr. Sarah Johnson", fromRole: "doctor", to: "patient@test.com", toName: "John Smith", toRole: "patient", subject: "Your recent results", body: "Your latest test results are available in your medical records. Let me know if you have any questions.", sentAt: hoursAgo(3), readAt: null },
];

/* =====================================================
   REPORT STATISTICS
   (the database computes these in the real app)
===================================================== */

const createMonthlyStats = () => {
  const values = [
    [182, 21, 14],
    [205, 26, 17],
    [231, 19, 12],
    [214, 24, 19],
    [248, 31, 22],
    [276, 34, 25],
  ];
  const now = new Date();

  return values.map(([appointments, registrations, feedback], index) => ({
    month: new Date(now.getFullYear(), now.getMonth() - (6 - index), 1).toLocaleDateString("en-GB", { month: "short" }),
    appointments,
    registrations,
    feedback,
  }));
};

const DEMO_APPOINTMENT_STATUS_STATS = [
  { label: "Completed", value: 1048 },
  { label: "Upcoming", value: 132 },
  { label: "Cancelled", value: 118 },
  { label: "No-show", value: 58 },
];

const DEMO_DEPARTMENT_STATS = [
  { label: "General Medicine", value: 412 },
  { label: "Cardiology", value: 298 },
  { label: "Dermatology", value: 214 },
  { label: "Orthopedics", value: 187 },
  { label: "Neurology", value: 151 },
  { label: "Pediatrics", value: 94 },
];

/* =====================================================
   INSTALL
===================================================== */

// Every string in the demo dataset (the Turkish scan treats these as user
// content rather than interface text).
export const collectDemoStrings = () => {
  const strings = new Set();
  const collect = (value) => {
    if (typeof value === "string") strings.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };

  [createAvailability, createPatients, createAppointments, createClinicalRecords, createUsers, createApplications, createFeedback, createActivity, createMessages]
    .forEach((create) => collect(create()));
  collect(DEMO_DOCTORS);

  return strings;
};

// Makes the demo dataset available to the data modules.
export const installDemoData = () => {
  setDoctors(DEMO_DOCTORS);
  setDepartments(DEMO_DEPARTMENT_STATS.map((item) => item.label));

  MONTHLY_STATS.splice(0, MONTHLY_STATS.length, ...createMonthlyStats());
  APPOINTMENT_STATUS_STATS.splice(0, APPOINTMENT_STATUS_STATS.length, ...DEMO_APPOINTMENT_STATUS_STATS);
  DEPARTMENT_STATS.splice(0, DEPARTMENT_STATS.length, ...DEMO_DEPARTMENT_STATS);

  registerDemoData({
    availability: createAvailability,
    patients: createPatients,
    appointments: createAppointments,
    clinicalRecords: createClinicalRecords,
    users: createUsers,
    applications: createApplications,
    feedback: createFeedback,
    activity: createActivity,
    messages: createMessages,
  });
};
