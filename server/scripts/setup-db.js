// Creates the healthcare database (schema) and fills it with the demo data.
//
//   npm run db:setup           schema + demo data
//   npm run db:setup -- --empty   schema only
//
// WARNING: drops and recreates the database named in schema.sql.

import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../config.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_PASSWORD = "password123";
const schemaOnly = process.argv.includes("--empty");

if (config.isProduction && !process.argv.includes("--force")) {
  console.error("Refusing to drop the database in production. Pass --force if you really mean it.");
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, "0");

// Whole days from today -> "YYYY-MM-DD" (UTC calendar day).
const dateOf = (days) => {
  if (days === null || days === undefined) return null;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

const to24h = (time) => {
  const [, h, m, period] = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  return `${pad((Number(h) % 12) + (period.toUpperCase() === "PM" ? 12 : 0))}:${m}:00`;
};

let connection;

try {
  connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
    dateStrings: true,
    timezone: "Z",
  });
} catch (error) {
  console.error(`Cannot connect to MySQL at ${config.db.host}:${config.db.port} as ${config.db.user}: ${error.code || error.message}`);
  console.error("Check DB_HOST / DB_USER / DB_PASSWORD in server/.env.");
  process.exit(1);
}

const dbName = config.db.database;

if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  console.error(`DB_NAME "${dbName}" may only contain letters, numbers and underscores.`);
  process.exit(1);
}

await connection.query("SET time_zone = '+00:00'");
await connection.query(
  `DROP DATABASE IF EXISTS \`${dbName}\`;
   CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   USE \`${dbName}\`;`
);
await connection.query(readFileSync(join(HERE, "../db/schema.sql"), "utf8"));
console.log(`Schema created in database "${dbName}".`);

if (schemaOnly) {
  await connection.end();
  process.exit(0);
}

const data = JSON.parse(readFileSync(join(HERE, "../db/demo-data.json"), "utf8"));
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10); // one hash keeps seeding fast

const run = (sql, params = []) => connection.query(sql, params).then(([result]) => result);

await connection.beginTransaction();

try {
  const deptIds = new Map();

  for (const name of data.departments) {
    deptIds.set(name, (await run("INSERT INTO department (dept_name) VALUES (?)", [name])).insertId);
  }

  const dept = (name) => (name ? deptIds.get(name) ?? null : null);
  const userIds = new Map(); // email -> user_id
  const doctorIds = new Map(); // slug -> user_id
  const patientData = new Map(data.patients.map((p) => [p.email, p]));

  for (const user of data.users) {
    const userType = user.role === "patient" ? "patient" : user.role === "admin" ? "admin" : "staff";
    const { insertId } = await run(
      `INSERT INTO users (full_name, email, password, phone, date_of_birth, created_at, last_login, status, user_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.name,
        user.email,
        passwordHash,
        user.phone,
        user.dateOfBirth,
        `${dateOf(user.joined)} 08:00:00`,
        user.lastLogin === null ? null : `${dateOf(user.lastLogin)} 09:00:00`,
        user.status,
        userType,
      ]
    );

    userIds.set(user.email, insertId);

    if (userType === "patient") {
      const p = patientData.get(user.email);

      await run(
        `INSERT INTO patient (user_id, gender, blood_group, address, allergies, emergency_contact_name, emergency_contact_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [insertId, p.gender, p.bloodType, p.address, p.allergies, p.emergencyContactName, p.emergencyContactPhone]
      );
    } else if (userType === "admin") {
      await run("INSERT INTO admin (user_id) VALUES (?)", [insertId]);
    } else {
      await run("INSERT INTO staff (user_id, staff_type, dept_id, hire_date) VALUES (?, ?, ?, ?)", [
        insertId,
        user.staffType,
        dept(user.department),
        dateOf(user.joined),
      ]);

      if (user.staffType === "doctor") {
        await run("INSERT INTO doctor (user_id, slug, specialization, license_number) VALUES (?, ?, ?, ?)", [
          insertId,
          user.slug,
          user.specialty,
          user.license,
        ]);
        doctorIds.set(user.slug, insertId);
      } else if (user.staffType === "nurse") {
        await run("INSERT INTO nurse (user_id, license_number) VALUES (?, ?)", [insertId, user.license]);
      }
    }
  }

  const uid = (email) => {
    const id = userIds.get(email);

    if (!id) throw new Error(`Unknown user in the demo data: ${email}`);

    return id;
  };

  for (const [slug, slots] of Object.entries(data.availability)) {
    for (const slot of slots) {
      await run(
        "INSERT INTO schedule (staff_id, schedule_no, work_day, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)",
        [doctorIds.get(slug), slot.id, slot.day, `${slot.startTime}:00`, `${slot.endTime}:00`, slot.status]
      );
    }
  }

  for (const a of data.appointments) {
    await run(
      `INSERT INTO appointment (patient_id, doctor_id, appointment_date, appointment_time, status, note, symptoms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid(a.patientEmail), doctorIds.get(a.doctorSlug), dateOf(a.day), to24h(a.time), a.status, a.reason, a.symptoms]
    );
  }

  for (const record of data.records) {
    const patientId = uid(record.patientEmail);

    for (const v of record.visits) {
      const { insertId } = await run(
        `INSERT INTO medical_record
           (patient_id, doctor_id, record_date, title, diagnosis, diagnosis_status, treatment, note, doctor_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          doctorIds.get(v.doctorSlug),
          dateOf(v.day),
          v.title ?? null,
          v.diagnosis ?? null,
          v.diagnosisStatus ?? null,
          v.treatment ?? null,
          v.note ?? null,
          v.doctorNote ?? null,
        ]
      );

      for (const [index, p] of v.prescriptions.entries()) {
        await run(
          `INSERT INTO prescription
             (record_id, prescription_no, medication_name, dosage, instruction, issue_date, frequency, duration, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [insertId, index + 1, p.medication, p.dosage, p.instruction, dateOf(p.day), p.frequency, p.duration, p.status]
        );
      }
    }

    if (record.vitals) {
      const v = record.vitals;

      await run(
        `INSERT INTO vital_signs (patient_id, recorded_at, heart_rate, blood_pressure, temperature, oxygen, weight)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [patientId, dateOf(v.day), v.heartRate, v.bloodPressure, v.temperature, v.oxygen, v.weight]
      );
    }
  }

  for (const t of data.labTests) {
    await run(
      `INSERT INTO lab_test (patient_id, doctor_id, test_name, description, test_date, result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid(t.patientEmail), doctorIds.get(t.doctorSlug), t.name, t.description, dateOf(t.day), t.result, t.status]
    );
  }

  for (const f of data.feedback) {
    await run(
      `INSERT INTO feedback
         (patient_id, doctor_id, dept_id, type, subject, message, rating, priority, status,
          submitted_at, response, responded_at, responded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid(f.patientEmail),
        f.doctorSlug ? doctorIds.get(f.doctorSlug) : null,
        dept(f.department),
        f.type,
        f.subject,
        f.message,
        f.rating,
        f.priority,
        f.status,
        dateOf(f.submittedDay),
        f.response,
        dateOf(f.respondedDay),
        f.responderEmail ? uid(f.responderEmail) : null,
      ]
    );
  }

  for (const a of data.applications) {
    await run(
      `INSERT INTO staff_application
         (full_name, email, phone, role, dept_id, license_number, experience_years, qualification, documents,
          submitted_at, status, reviewed_at, reviewed_by, review_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.name,
        a.email,
        a.phone,
        a.role,
        dept(a.department),
        a.licenseNumber,
        a.experience,
        a.qualification,
        JSON.stringify(a.documents),
        dateOf(a.submittedDay),
        a.status,
        dateOf(a.reviewedDay),
        a.reviewerEmail ? uid(a.reviewerEmail) : null,
        a.reviewNote,
      ]
    );
  }

  for (const entry of data.activity) {
    await run(
      `INSERT INTO activity_log (user_id, user_name, role, action, module, status, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userEmail ? uid(entry.userEmail) : null,
        entry.user,
        entry.role,
        entry.action,
        entry.module,
        entry.status,
        entry.ip,
        `${dateOf(entry.day)} ${entry.time}:00`,
      ]
    );
  }

  // [from, to, subject, body, hours ago, read]
  const MESSAGES = [
    ["patient@test.com", "doctor@test.com", "Question about my blood pressure", "Hello Dr. Johnson, my home readings are around 135/85 in the mornings. Should I be worried before my next visit?", 52, true],
    ["doctor@test.com", "patient@test.com", "Re: Question about my blood pressure", "Thank you for the readings, John. That is slightly elevated but not urgent. Please keep a daily log and bring it to your appointment.", 50, true],
    ["staff@test.com", "patient@test.com", "Preparing for your appointment", "Hello John, please avoid caffeine for two hours before your appointment and bring your list of current medications.", 6, false],
    ["doctor@test.com", "patient@test.com", "Your recent results", "Your latest test results are available in your medical records. Let me know if you have any questions.", 3, false],
    ["staff@test.com", "doctor@test.com", "Cardiology clinic supplies", "Dr. Johnson, the ECG paper has been restocked in the cardiology clinic.", 20, false],
  ];

  for (const [from, to, subject, body, hoursAgo, read] of MESSAGES) {
    await run(
      `INSERT INTO message (sender_id, recipient_id, subject, body, sent_at, read_at)
       VALUES (?, ?, ?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR),
               IF(?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR), NULL))`,
      [uid(from), uid(to), subject, body, hoursAgo, read ? 1 : 0, Math.max(hoursAgo - 1, 0)]
    );
  }

  await connection.commit();
  console.log(`Demo data loaded. Every account's password is: ${DEMO_PASSWORD}`);
  console.log("Demo sign-ins: patient@test.com, doctor@test.com, staff@test.com, admin@test.com");
} catch (error) {
  await connection.rollback();
  console.error("Seeding failed, nothing was saved:", error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
