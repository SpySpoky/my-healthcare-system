import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db.js";

const app = createApp();
const PASSWORD = "password123";

const tokens = {};
const login = async (email, role) => {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD, role });

  expect(res.status).toBe(200);

  return res.body;
};
const as = (name) => ({ Authorization: `Bearer ${tokens[name]}` });

// A weekday the demo doctor works (Monday), past the last demo
// appointment (8 days out), so the slot the booking tests use is always
// free whichever day the suite runs on.
const nextMonday = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 15);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
};

beforeAll(async () => {
  for (const [name, email, role] of [
    ["patient", "patient@test.com", "patient"],
    ["doctor", "doctor@test.com", "doctor"],
    ["staff", "staff@test.com", "medical_staff"],
    ["admin", "admin@test.com", "admin"],
  ]) {
    tokens[name] = (await login(email, role)).token;
  }
});

afterAll(() => pool.end());

describe("authentication", () => {
  it("returns the signed-in user in the shape the app expects", async () => {
    const { user } = await login("patient@test.com", "patient");

    expect(user).toMatchObject({ role: "patient", email: "patient@test.com", patientId: 1 });
    expect(user.id).toMatch(/^U\d{3}$/);

    const doctor = (await login("doctor@test.com", "doctor")).user;
    expect(doctor.doctorId).toBe("sarah-johnson");
  });

  it("rejects a wrong password and an unknown email with the same message", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: "patient@test.com", password: "nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@test.com", password: PASSWORD });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it("rejects the wrong account type", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@test.com", password: PASSWORD, role: "admin" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not registered as an Administrator/);
  });

  it("registers a patient, who can then sign in, and blocks duplicate emails", async () => {
    const body = {
      fullName: "Nora Test",
      email: "Nora.Test@Example.com",
      phone: "+90 555 000 1111",
      gender: "female",
      dateOfBirth: "1990-05-05",
      password: "StrongPass1",
    };
    const created = await request(app).post("/api/auth/register").send(body);

    expect(created.status).toBe(201);

    const duplicate = await request(app).post("/api/auth/register").send({ ...body, email: "nora.test@example.com" });
    expect(duplicate.status).toBe(409);

    const signedIn = await request(app)
      .post("/api/auth/login")
      .send({ email: "nora.test@example.com", password: "StrongPass1", role: "patient" });
    expect(signedIn.status).toBe(200);

    const weak = await request(app).post("/api/auth/register").send({ ...body, email: "weak@example.com", password: "short" });
    expect(weak.status).toBe(400);
  });

  it("resets a password with the emailed token only once", async () => {
    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: "nora.test@example.com" });
    const token = forgot.body.devResetToken;

    expect(token).toBeTruthy();

    const reset = await request(app).post("/api/auth/reset-password").send({ token, password: "BrandNew123" });
    expect(reset.status).toBe(200);

    const again = await request(app).post("/api/auth/reset-password").send({ token, password: "AnotherOne1" });
    expect(again.status).toBe(400);

    const login2 = await request(app)
      .post("/api/auth/login")
      .send({ email: "nora.test@example.com", password: "BrandNew123" });
    expect(login2.status).toBe(200);
  });

  it("needs a valid token for protected routes", async () => {
    expect((await request(app).get("/api/bootstrap")).status).toBe(401);
    expect((await request(app).get("/api/bootstrap").set("Authorization", "Bearer nonsense")).status).toBe(401);
  });
});

describe("bootstrap (role scoping)", () => {
  it("gives a patient only their own data", async () => {
    const { body } = await request(app).get("/api/bootstrap").set(as("patient"));

    expect(body.patients).toHaveLength(1);
    expect(body.patients[0].email).toBe("patient@test.com");
    expect(body.users).toEqual([]);
    expect(body.activity).toEqual([]);

    const own = body.appointments.filter((a) => !a.busy);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((a) => a.patientId === 1)).toBe(true);
    // Other people's slots arrive without any personal details.
    body.appointments.filter((a) => a.busy).forEach((a) => expect(a.patient).toBe(""));

    expect(Object.keys(body.clinicalRecords)).toEqual(["1"]);
    expect(body.doctors.map((d) => d.id)).toContain("sarah-johnson");
  });

  it("serves doctors and departments from the database", async () => {
    const { body } = await request(app).get("/api/bootstrap").set(as("patient"));

    expect(body.doctors).toHaveLength(6);
    expect(body.doctors[0]).toMatchObject({ name: "Dr. Sarah Johnson", department: "Cardiology", specialty: "Cardiology Specialist" });
    expect(body.departments).toEqual(expect.arrayContaining(["Cardiology", "Neurology", "Radiology"]));
    expect(body.departments).toEqual([...body.departments].sort());
  });

  it("gives a doctor only their own appointments but all patients", async () => {
    const { body } = await request(app).get("/api/bootstrap").set(as("doctor"));

    expect(body.patients.length).toBeGreaterThan(5);
    expect(body.appointments.every((a) => a.doctorId === "sarah-johnson")).toBe(true);
    expect(body.users).toEqual([]);
  });

  it("gives an administrator accounts, applications and reports but no clinical records", async () => {
    const { body } = await request(app).get("/api/bootstrap").set(as("admin"));

    expect(body.users.length).toBeGreaterThan(20);
    expect(body.applications.length).toBe(7);
    expect(body.reports.monthly).toHaveLength(6);
    expect(body.clinicalRecords).toEqual({});
  });
});

describe("appointments", () => {
  let appointmentId;
  const date = nextMonday();

  it("books an appointment and prevents double booking", async () => {
    const booking = { doctorId: "sarah-johnson", date, time: "09:30 AM", reason: "API test visit", symptoms: "none" };
    const first = await request(app).post("/api/appointments").set(as("patient")).send(booking);

    expect(first.status).toBe(201);
    expect(first.body.appointment).toMatchObject({ doctorId: "sarah-johnson", status: "Pending", time: "09:30 AM" });
    appointmentId = first.body.appointment.id;

    const second = await request(app).post("/api/appointments").set(as("patient")).send(booking);
    expect(second.status).toBe(409);
  });

  it("rejects times outside the doctor's working hours and past dates", async () => {
    const night = await request(app)
      .post("/api/appointments")
      .set(as("patient"))
      .send({ doctorId: "sarah-johnson", date, time: "08:00 PM", reason: "Too late" });
    expect(night.status).toBe(400);

    const past = await request(app)
      .post("/api/appointments")
      .set(as("patient"))
      .send({ doctorId: "sarah-johnson", date: "2020-01-06", time: "09:30 AM", reason: "Past" });
    expect(past.status).toBe(400);
  });

  it("lets the doctor confirm it but not another doctor", async () => {
    const other = (await login("michael.smith@healthcare.test", "doctor")).token;
    const denied = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set({ Authorization: `Bearer ${other}` })
      .send({ status: "Confirmed" });
    expect(denied.status).toBe(403);

    const ok = await request(app).patch(`/api/appointments/${appointmentId}`).set(as("doctor")).send({ status: "Confirmed" });
    expect(ok.status).toBe(200);
    expect(ok.body.appointment.status).toBe("Confirmed");
  });

  it("stops patients from confirming or completing appointments themselves", async () => {
    const res = await request(app).patch(`/api/appointments/${appointmentId}`).set(as("patient")).send({ status: "Completed" });

    expect(res.status).toBe(403);
  });

  it("lets the patient cancel, frees the slot, and keeps cancelled appointments closed", async () => {
    const cancel = await request(app).patch(`/api/appointments/${appointmentId}`).set(as("patient")).send({ status: "Cancelled" });
    expect(cancel.body.appointment.status).toBe("Cancelled");

    const rebook = await request(app)
      .post("/api/appointments")
      .set(as("patient"))
      .send({ doctorId: "sarah-johnson", date, time: "09:30 AM", reason: "Re-booked" });
    expect(rebook.status).toBe(201);

    const again = await request(app).patch(`/api/appointments/${appointmentId}`).set(as("patient")).send({ status: "Pending" });
    expect(again.status).toBe(409);
  });
});

describe("patients and users", () => {
  it("lets a patient update their own profile but not someone else's", async () => {
    const ok = await request(app)
      .patch("/api/patients/1")
      .set(as("patient"))
      .send({ address: "1 Test Street", emergencyContactName: "Sam Test" });

    expect(ok.status).toBe(200);
    expect(ok.body.patient).toMatchObject({ address: "1 Test Street", emergencyContactName: "Sam Test" });

    expect((await request(app).patch("/api/patients/2").set(as("patient")).send({ address: "x" })).status).toBe(403);
  });

  it("refuses an email that another account uses", async () => {
    const res = await request(app).patch("/api/patients/1").set(as("patient")).send({ email: "doctor@test.com" });

    expect(res.status).toBe(409);
  });

  it("lets only administrators manage users, and not lock themselves out", async () => {
    expect((await request(app).get("/api/users").set(as("patient"))).status).toBe(403);

    const users = (await request(app).get("/api/users").set(as("admin"))).body.users;
    const admin = users.find((u) => u.email === "admin@test.com");
    const john = users.find((u) => u.email === "patient@test.com");

    const self = await request(app).patch(`/api/users/${admin.id}`).set(as("admin")).send({ status: "Inactive" });
    expect(self.status).toBe(400);

    const roleChange = await request(app).patch(`/api/users/${john.id}`).set(as("admin")).send({ role: "admin" });
    expect(roleChange.status).toBe(400);

    const suspended = await request(app).patch(`/api/users/${john.id}`).set(as("admin")).send({ status: "Suspended" });
    expect(suspended.body.user.status).toBe("Suspended");

    // A suspended account loses access immediately, even with a valid token.
    expect((await request(app).get("/api/bootstrap").set(as("patient"))).status).toBe(401);

    await request(app).patch(`/api/users/${john.id}`).set(as("admin")).send({ status: "Active" });
    expect((await request(app).get("/api/bootstrap").set(as("patient"))).status).toBe(200);
  });
});

describe("clinical records", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("lets a doctor add a diagnosis and prescription that the patient then sees", async () => {
    const diagnosis = await request(app)
      .post("/api/patients/1/record/diagnoses")
      .set(as("doctor"))
      .send({ date: today, diagnosis: "API Test Condition", notes: "Test notes", status: "Active" });

    expect(diagnosis.status).toBe(201);
    expect(diagnosis.body.record.diagnoses.find((d) => d.diagnosis === "API Test Condition")).toMatchObject({
      doctor: "Dr. Sarah Johnson",
      status: "Active",
    });

    const rx = await request(app)
      .post("/api/patients/1/record/prescriptions")
      .set(as("doctor"))
      .send({ date: today, medication: "Testamol", dosage: "1 tablet", frequency: "Daily", duration: "3 days", instructions: "With water" });
    expect(rx.status).toBe(201);

    const patientView = await request(app).get("/api/patients/1/record").set(as("patient"));
    expect(patientView.body.record.prescriptions.map((p) => p.medication)).toContain("Testamol");
    expect(patientView.body.record.diagnoses.map((d) => d.diagnosis)).toContain("API Test Condition");
  });

  it("blocks patients writing records, other patients' records and admin access", async () => {
    expect(
      (await request(app).post("/api/patients/1/record/notes").set(as("patient")).send({ note: "self-note" })).status
    ).toBe(403);
    expect((await request(app).get("/api/patients/2/record").set(as("patient"))).status).toBe(403);
    expect((await request(app).get("/api/patients/1/record").set(as("admin"))).status).toBe(403);
  });

  it("validates the entry", async () => {
    const res = await request(app).post("/api/patients/1/record/diagnoses").set(as("doctor")).send({ diagnosis: "" });

    expect(res.status).toBe(400);
  });
});

describe("availability", () => {
  it("lets a doctor replace their own schedule, rejecting overlaps", async () => {
    const overlap = await request(app)
      .put("/api/doctors/sarah-johnson/availability")
      .set(as("doctor"))
      .send({ slots: [
        { day: "Monday", startTime: "09:00", endTime: "12:00" },
        { day: "Monday", startTime: "11:00", endTime: "13:00" },
      ] });
    expect(overlap.status).toBe(400);

    const ok = await request(app)
      .put("/api/doctors/sarah-johnson/availability")
      .set(as("doctor"))
      .send({ slots: [{ day: "Monday", startTime: "09:00", endTime: "12:00", status: "Available" }] });
    expect(ok.status).toBe(200);
    expect(ok.body.slots).toHaveLength(1);

    const denied = await request(app).put("/api/doctors/michael-smith/availability").set(as("doctor")).send({ slots: [] });
    expect(denied.status).toBe(403);
  });
});

describe("feedback", () => {
  let id;

  it("lets a patient submit, edit and delete feedback", async () => {
    const created = await request(app)
      .post("/api/feedback")
      .set(as("patient"))
      .send({ type: "Complaint", subject: "API test", message: "Testing the feedback flow", rating: 2 });

    expect(created.status).toBe(201);
    expect(created.body.feedback).toMatchObject({ status: "Open", priority: "High", patientId: 1 });
    id = created.body.feedback.id;

    const edited = await request(app)
      .patch(`/api/feedback/${id}`)
      .set(as("patient"))
      .send({ type: "Feedback", subject: "API test 2", message: "Edited message", rating: 5 });
    expect(edited.body.feedback).toMatchObject({ subject: "API test 2", priority: "Low" });
  });

  it("lets an administrator respond, and requires a response to resolve", async () => {
    const noResponse = await request(app).patch(`/api/feedback/${id}`).set(as("admin")).send({ status: "Resolved" });
    expect(noResponse.status).toBe(400);

    const ok = await request(app)
      .patch(`/api/feedback/${id}`)
      .set(as("admin"))
      .send({ status: "Resolved", response: "Thanks for the feedback, resolved." });
    expect(ok.body.feedback).toMatchObject({ status: "Resolved", respondedBy: "Test Administrator" });
  });

  it("keeps other patients out and lets the owner delete", async () => {
    const other = (await login("emily.johnson@example.com", "patient")).token;
    const denied = await request(app).delete(`/api/feedback/${id}`).set({ Authorization: `Bearer ${other}` });
    expect(denied.status).toBe(403);

    expect((await request(app).delete(`/api/feedback/${id}`).set(as("patient"))).status).toBe(204);
  });

  it("applies the feedback form's rules when the form is bypassed", async () => {
    const valid = { type: "Feedback", subject: "Waiting room", message: "The waiting room was clean.", rating: 4 };
    const cases = [
      [{ subject: "Hi" }, "Subject must be at least 3 characters."],
      [{ subject: "x".repeat(101) }, "Subject must be at most 100 characters."],
      [{ message: "Too short" }, "Message must be at least 10 characters."],
      [{ message: "x".repeat(1001) }, "Message must be at most 1000 characters."],
      [{ message: "Please visit www.example.com today" }, "Links and URLs are not allowed."],
      [{ message: "Hello <b>doctor</b> and staff" }, "HTML tags are not allowed."],
      [{ subject: "Rude", message: "The staff were stupid to me." }, "Please remove inappropriate language."],
    ];

    for (const [change, error] of cases) {
      const response = await request(app).post("/api/feedback").set(as("patient")).send({ ...valid, ...change });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(error);
    }
  });
});

describe("applications", () => {
  it("approving an application creates a doctor account that can sign in", async () => {
    const apps = (await request(app).get("/api/applications").set(as("admin"))).body.applications;
    const pending = apps.find((a) => a.id === "APP-1001");

    expect(pending.status).toBe("Pending");

    const noReason = await request(app).patch("/api/applications/APP-1004").set(as("admin")).send({ status: "Rejected" });
    expect(noReason.status).toBe(400);

    const approved = await request(app).patch("/api/applications/APP-1001").set(as("admin")).send({ status: "Approved" });
    expect(approved.body.application).toMatchObject({ status: "Approved", reviewedBy: "Test Administrator" });

    const again = await request(app).patch("/api/applications/APP-1001").set(as("admin")).send({ status: "Rejected", reviewNote: "Changed my mind later" });
    expect(again.status).toBe(409);

    const boot = (await request(app).get("/api/bootstrap").set(as("admin"))).body;
    expect(boot.users.some((u) => u.email === "hannah.lee@example.com" && u.role === "doctor")).toBe(true);
    expect(boot.doctors.some((d) => d.id === "hannah-lee")).toBe(true);

    // The new account has a random password until the doctor uses "Forgot password".
    const blocked = await request(app).post("/api/auth/login").send({ email: "hannah.lee@example.com", password: PASSWORD });
    expect(blocked.status).toBe(401);
  });

  it("accepts public applications and rejects duplicates", async () => {
    const body = { name: "Dr. Public Applicant", email: "public.applicant@example.com", role: "doctor", department: "Cardiology", licenseNumber: "MD-1" };
    const send = () => {
      const post = request(app).post("/api/applications");

      Object.entries(body).forEach(([key, value]) => post.field(key, value));

      return post.attach("documents", Buffer.from("%PDF-1.4 cv"), "CV.pdf");
    };

    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(409);
  });

  it("is admin only", async () => {
    expect((await request(app).get("/api/applications").set(as("doctor"))).status).toBe(403);
    expect((await request(app).patch("/api/applications/APP-1002").set(as("doctor")).send({ status: "Approved" })).status).toBe(403);
  });
});

describe("activity log", () => {
  it("records actions under the signed-in user, not a name the client supplies", async () => {
    const res = await request(app)
      .post("/api/activity")
      .set(as("patient"))
      .send({ action: "Updated profile information", module: "Users", user: "Test Administrator", role: "admin" });
    expect(res.status).toBe(201);

    const log = (await request(app).get("/api/activity").set(as("admin"))).body.activity;
    const entry = log.find((item) => item.action === "Updated profile information");

    expect(entry).toMatchObject({ user: "John Smith", role: "patient", module: "Users" });

    expect((await request(app).post("/api/activity").set(as("patient")).send({ action: "x", module: "Nope" })).status).toBe(400);
    expect((await request(app).get("/api/activity").set(as("patient"))).status).toBe(403);
  });
});

describe("documents", () => {
  const PASSPORT = Buffer.from("%PDF-1.4 passport scan");

  const upload = (who, { patient = 1, type = "Passport", name = "passport.pdf", content = PASSPORT } = {}) =>
    request(app)
      .post(`/api/patients/${patient}/documents`)
      .set(as(who))
      .field("type", type)
      .attach("document", content, name);

  let documentId;

  it("stores a document the patient uploads", async () => {
    const res = await upload("patient");

    expect(res.status).toBe(201);
    expect(res.body.documents[0]).toMatchObject({
      name: "passport.pdf",
      category: "Passport",
      type: "application/pdf",
      size: PASSPORT.length,
      stored: true,
    });

    documentId = res.body.documents[0].id;

    // It comes back with the rest of the patient's data.
    const { documents } = (await request(app).get("/api/bootstrap").set(as("patient"))).body;
    expect(documents["1"].some((item) => item.id === documentId)).toBe(true);
  });

  it("keeps one patient's documents away from another", async () => {
    expect((await upload("patient", { patient: 2 })).status).toBe(403);
    expect((await request(app).get(`/api/patients/1/documents/${documentId}`).set(as("doctor"))).status).toBe(403);
    expect((await request(app).delete(`/api/patients/1/documents/${documentId}`).set(as("doctor"))).status).toBe(403);
  });

  it("gives the patient their file back", async () => {
    const file = await request(app).get(`/api/patients/1/documents/${documentId}`).set(as("patient"));

    expect(file.status).toBe(200);
    expect(file.headers["content-disposition"]).toContain('filename="passport.pdf"');
    expect(Buffer.from(file.body)).toEqual(PASSPORT);
  });

  it("validates the upload", async () => {
    expect((await upload("patient", { name: "passport.pdf" })).status).toBe(409);
    expect((await upload("patient", { type: "Nonsense", name: "other.pdf" })).status).toBe(400);
    expect((await upload("patient", { name: "notes.txt", content: Buffer.from("text") })).status).toBe(400);

    const tooBig = await upload("patient", { name: "huge.pdf", content: Buffer.alloc(11 * 1024 * 1024, 1) });
    expect(tooBig.status).toBe(400);
  });

  it("deletes the document", async () => {
    const removed = await request(app).delete(`/api/patients/1/documents/${documentId}`).set(as("patient"));

    expect(removed.status).toBe(200);
    expect(removed.body.documents.some((item) => item.id === documentId)).toBe(false);
    expect((await request(app).get(`/api/patients/1/documents/${documentId}`).set(as("patient"))).status).toBe(404);
  });
});

describe("messages", () => {
  let sentId;

  it("shows the patient's inbox with unread messages from the care team", async () => {
    const count = await request(app).get("/api/messages/unread-count").set(as("patient"));
    expect(count.body.count).toBe(2);

    const { body } = await request(app).get("/api/messages").set(as("patient"));
    const unread = body.messages.filter((m) => m.direction === "in" && !m.read);

    expect(unread.map((m) => m.otherName).sort()).toEqual(["Dr. Sarah Johnson", "Nurse Laura Kim"]);
    expect(body.messages.some((m) => m.direction === "out")).toBe(true);
  });

  it("only offers the care team as contacts to a patient, never other patients or admins", async () => {
    const { body } = await request(app).get("/api/messages/contacts").set(as("patient"));

    expect(body.contacts.length).toBeGreaterThan(5);
    expect(body.contacts.every((c) => ["doctor", "medical_staff"].includes(c.role))).toBe(true);
    expect(body.contacts.some((c) => c.name === "Test Administrator")).toBe(false);
  });

  it("sends a message that the recipient receives as unread", async () => {
    const contacts = (await request(app).get("/api/messages/contacts").set(as("patient"))).body.contacts;
    const doctor = contacts.find((c) => c.name === "Dr. Sarah Johnson");

    const sent = await request(app)
      .post("/api/messages")
      .set(as("patient"))
      .send({ recipientId: doctor.id, subject: "Test subject", body: "Hello doctor, this is a test message." });

    expect(sent.status).toBe(201);
    expect(sent.body.message).toMatchObject({ direction: "out", otherName: "Dr. Sarah Johnson", read: true });
    sentId = sent.body.message.id;

    const inbox = (await request(app).get("/api/messages").set(as("doctor"))).body.messages;
    expect(inbox.find((m) => m.id === sentId)).toMatchObject({ direction: "in", otherName: "John Smith", read: false });
  });

  it("rejects bad recipients, other patients and empty messages", async () => {
    const contacts = (await request(app).get("/api/messages/contacts").set(as("doctor"))).body.contacts;
    const otherPatient = contacts.find((c) => c.name === "Emily Johnson");
    const admin = (await request(app).get("/api/users").set(as("admin"))).body.users.find((u) => u.role === "admin");

    const patientToPatient = await request(app)
      .post("/api/messages")
      .set(as("patient"))
      .send({ recipientId: otherPatient.id, subject: "Hi", body: "Hello there friend" });
    expect(patientToPatient.status).toBe(400);

    const toAdmin = await request(app)
      .post("/api/messages")
      .set(as("patient"))
      .send({ recipientId: Number(admin.id.slice(1)), subject: "Hi", body: "Hello there friend" });
    expect(toAdmin.status).toBe(400);

    const empty = await request(app).post("/api/messages").set(as("doctor")).send({ recipientId: otherPatient.id, subject: "", body: "" });
    expect(empty.status).toBe(400);

    expect((await request(app).get("/api/messages").set(as("admin"))).status).toBe(403);
  });

  it("marks messages read for the recipient only", async () => {
    const forbidden = await request(app).patch(`/api/messages/${sentId}/read`).set(as("staff"));
    expect(forbidden.status).toBe(403);

    expect((await request(app).patch(`/api/messages/${sentId}/read`).set(as("doctor"))).status).toBe(200);

    const inbox = (await request(app).get("/api/messages").set(as("doctor"))).body.messages;
    expect(inbox.find((m) => m.id === sentId).read).toBe(true);
  });

  it("deletes only the caller's copy", async () => {
    expect((await request(app).delete(`/api/messages/${sentId}`).set(as("staff"))).status).toBe(403);
    expect((await request(app).delete(`/api/messages/${sentId}`).set(as("patient"))).status).toBe(204);

    const patientBox = (await request(app).get("/api/messages").set(as("patient"))).body.messages;
    const doctorBox = (await request(app).get("/api/messages").set(as("doctor"))).body.messages;

    expect(patientBox.some((m) => m.id === sentId)).toBe(false);
    expect(doctorBox.some((m) => m.id === sentId)).toBe(true);
  });
});

describe("staff applications", () => {
  const applicant = {
    name: "Dr. Leyla Demir",
    email: "leyla.demir@example.com",
    phone: "+90 555 410 2200",
    role: "doctor",
    department: "Cardiology",
    licenseNumber: "MD-TR-903311",
    experience: 9,
    qualification: "MD, Cardiology — Ege University",
    password: PASSWORD,
  };

  const LICENCE = Buffer.from("%PDF-1.4 licence");
  const CV = Buffer.from("%PDF-1.4 curriculum vitae");

  // The form is multipart, so every field is attached one by one.
  const apply = (overrides = {}, files = [["Medical license.pdf", LICENCE], ["CV.pdf", CV]]) => {
    const post = request(app).post("/api/applications");

    Object.entries({ ...applicant, ...overrides }).forEach(([key, value]) => post.field(key, String(value)));
    files.forEach(([name, content]) => post.attach("documents", content, name));

    return post;
  };

  let applicationId;

  it("accepts an application with its documents and shows it to the admin only", async () => {
    const sent = await apply();
    expect(sent.status).toBe(201);

    const again = await apply();
    expect(again.status).toBe(409);

    expect((await request(app).get("/api/applications")).status).toBe(401);
    expect((await request(app).get("/api/applications").set(as("patient"))).status).toBe(403);

    const { applications } = (await request(app).get("/api/applications").set(as("admin"))).body;
    const pending = applications.find((item) => item.email === applicant.email);

    expect(pending).toMatchObject({ name: applicant.name, role: "doctor", status: "Pending" });
    expect(pending.documents).toEqual([
      { id: 1, name: "Medical license.pdf", type: "application/pdf", size: LICENCE.length, stored: true },
      { id: 2, name: "CV.pdf", type: "application/pdf", size: CV.length, stored: true },
    ]);
    applicationId = pending.id;
  });

  it("gives the administrator the uploaded file, and nobody else", async () => {
    const path = `/api/applications/${applicationId}/documents/1`;

    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set(as("doctor"))).status).toBe(403);

    const file = await request(app).get(path).set(as("admin"));

    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toContain("application/pdf");
    expect(file.headers["content-disposition"]).toContain('filename="Medical license.pdf"');
    expect(Buffer.from(file.body)).toEqual(LICENCE);

    // A document the demo data only recorded by name has no file.
    const nameOnly = await request(app).get("/api/applications/APP-1001/documents/1").set(as("admin"));
    expect(nameOnly.status).toBe(404);
  });

  it("refuses an application with no documents, the wrong type or an oversized file", async () => {
    const none = await apply({ email: "nodocs@example.com" }, []);
    expect(none.status).toBe(400);

    const wrongType = await apply({ email: "wrongtype@example.com" }, [
      ["notes.txt", Buffer.from("plain text")],
    ]);
    expect(wrongType.status).toBe(400);

    const tooBig = await apply({ email: "toobig@example.com" }, [
      ["huge.pdf", Buffer.alloc(11 * 1024 * 1024, 1)],
    ]);
    expect(tooBig.status).toBe(400);
  });

  it("rejects an application for an email that already has an account", async () => {
    const taken = await apply({ email: "doctor@test.com" });

    expect(taken.status).toBe(409);
  });

  it("creates the account on approval, with the password from the application", async () => {
    const approved = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set(as("admin"))
      .send({ status: "Approved", reviewNote: "Credentials verified." });

    expect(approved.status).toBe(200);
    expect(approved.body.application.status).toBe("Approved");

    const { user } = await login(applicant.email, "doctor");
    expect(user).toMatchObject({ role: "doctor", email: applicant.email });
  });
});

describe("user administration", () => {
  let createdId;

  it("lets an administrator create an account that can then sign in", async () => {
    const nurse = {
      name: "Nurse Aylin Kaya",
      email: "aylin.kaya@example.com",
      phone: "+90 555 410 3300",
      role: "medical_staff",
      department: "Emergency",
      password: PASSWORD,
    };

    expect((await request(app).post("/api/users").set(as("doctor")).send(nurse)).status).toBe(403);

    const created = await request(app).post("/api/users").set(as("admin")).send(nurse);

    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ name: nurse.name, role: "medical_staff", status: "Active" });
    createdId = created.body.user.id;

    const { user } = await login(nurse.email, "medical_staff");
    expect(user.email).toBe(nurse.email);
  });

  it("validates new accounts and refuses a duplicate email", async () => {
    const weak = await request(app)
      .post("/api/users")
      .set(as("admin"))
      .send({ name: "Short Pass", email: "short@example.com", phone: "+90 555 410 4400", role: "patient", password: "abc" });

    expect(weak.status).toBe(400);

    const duplicate = await request(app)
      .post("/api/users")
      .set(as("admin"))
      .send({ name: "Copy Cat", email: "patient@test.com", phone: "+90 555 410 4401", role: "patient", password: PASSWORD });

    expect(duplicate.status).toBe(409);

    const noDepartment = await request(app)
      .post("/api/users")
      .set(as("admin"))
      .send({ name: "No Department", email: "nodept@example.com", phone: "+90 555 410 4402", role: "doctor", password: PASSWORD });

    expect(noDepartment.status).toBe(400);
  });

  it("deletes an account, but keeps one with clinical history", async () => {
    expect((await request(app).delete(`/api/users/${createdId}`).set(as("patient"))).status).toBe(403);

    // The demo doctor has appointments and medical records, which the
    // schema keeps (ON DELETE RESTRICT), so the account cannot go.
    const doctor = (await request(app).get("/api/auth/me").set(as("doctor"))).body.user;
    const busy = await request(app).delete(`/api/users/${doctor.id}`).set(as("admin"));

    expect(busy.status).toBe(409);

    const removed = await request(app).delete(`/api/users/${createdId}`).set(as("admin"));
    expect(removed.status).toBe(204);

    const { users } = (await request(app).get("/api/users").set(as("admin"))).body;
    expect(users.some((user) => user.id === createdId)).toBe(false);
  });

  it("stops an administrator from deleting their own account", async () => {
    const me = (await request(app).get("/api/auth/me").set(as("admin"))).body.user;
    const res = await request(app).delete(`/api/users/${me.id}`).set(as("admin"));

    expect(res.status).toBe(400);
  });
});

describe("vital signs", () => {
  const reading = { heartRate: 72, bloodPressure: "118/76", temperature: 36.6, oxygen: 98, weight: 70.5 };

  it("lets medical staff record a reading, which becomes the patient's status", async () => {
    const saved = await request(app).post("/api/patients/1/record/vitals").set(as("staff")).send(reading);

    expect(saved.status).toBe(201);
    expect(saved.body.record.vitals).toMatchObject({
      heartRate: "72",
      bloodPressure: "118/76",
      temperature: "36.6",
      oxygen: "98",
      weight: "70.5",
    });
    expect(saved.body.record.vitalsHistory[0]).toMatchObject({ bloodPressure: "118/76" });
  });

  it("validates the readings", async () => {
    const empty = await request(app).post("/api/patients/1/record/vitals").set(as("staff")).send({});
    expect(empty.status).toBe(400);

    const silly = await request(app).post("/api/patients/1/record/vitals").set(as("staff")).send({ heartRate: 900 });
    expect(silly.status).toBe(400);

    const badPressure = await request(app)
      .post("/api/patients/1/record/vitals")
      .set(as("staff"))
      .send({ bloodPressure: "high" });
    expect(badPressure.status).toBe(400);
  });

  it("keeps the rest of the record for doctors, and patients out of it", async () => {
    const diagnosis = await request(app)
      .post("/api/patients/1/record/diagnoses")
      .set(as("staff"))
      .send({ diagnosis: "Not allowed", notes: "Nurses cannot diagnose." });

    expect(diagnosis.status).toBe(403);

    expect((await request(app).post("/api/patients/1/record/vitals").set(as("patient")).send(reading)).status).toBe(403);
    expect((await request(app).post("/api/patients/1/record/vitals").set(as("admin")).send(reading)).status).toBe(403);
  });
});

describe("robustness", () => {
  it("returns JSON errors for bad input and unknown routes", async () => {
    expect((await request(app).get("/api/nope")).status).toBe(404);

    const bad = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{not json");
    expect(bad.status).toBe(400);

    const injection = await request(app).post("/api/auth/login").send({ email: "' OR '1'='1", password: "x" });
    expect(injection.status).toBe(401);
  });

  it("reports healthy when the database is reachable", async () => {
    expect((await request(app).get("/api/health")).body).toEqual({ status: "ok" });
  });
});
