// @vitest-environment jsdom
//
// Runs the real front end data layer (hydrate, saveStored, persist)
// against the real API and MySQL, the way the pages use it.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db.js";

let server;
let api, setToken, SYNC_ERROR_EVENT;
let hydrate, flushChanges;
let appointments, doctors, feedback, storage;

const signIn = async (email, role) => {
  const { token, user } = await api.post("/auth/login", { email, password: "password123", role });

  setToken(token, { remember: false });
  sessionStorage.setItem("healthcare_user", JSON.stringify(user));
  await hydrate();

  return user;
};

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  vi.stubEnv("VITE_USE_API", "true");
  vi.stubEnv("VITE_API_URL", `http://127.0.0.1:${server.address().port}/api`);

  ({ api, setToken, SYNC_ERROR_EVENT } = await import("../../src/api/client.js"));
  ({ hydrate } = await import("../../src/api/hydrate.js"));
  ({ flushChanges } = await import("../../src/api/persist.js"));
  appointments = await import("../../src/data/appointmentData.js");
  doctors = await import("../../src/data/doctorsData.js");
  feedback = await import("../../src/data/feedbackData.js");
  storage = await import("../../src/data/storage.js");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

const serverAppointments = async () => (await api.get("/bootstrap")).appointments.filter((a) => !a.busy);

// A Monday at least a week ahead (the demo doctors work Mondays 09:00-12:00).
const monday = (() => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 14);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
})();

describe("front end data layer against the real API", () => {
  it("loads the patient's data into the synchronous data modules", async () => {
    const user = await signIn("patient@test.com", "patient");

    expect(user.patientId).toBe(1);
    expect(doctors.DOCTORS.map((d) => d.id)).toContain("sarah-johnson");
    expect(doctors.DEPARTMENTS).toContain("Cardiology");
    expect(appointments.getPatientAppointments(1).length).toBeGreaterThan(3);
    expect(storage.loadStored("healthcare_patients", () => []).map((p) => p.email)).toEqual(["patient@test.com"]);
  });

  it("books and cancels an appointment through saveAppointments / updateAppointment", async () => {
    const current = appointments.loadAppointments();
    const tempId = appointments.getNextAppointmentId(current);

    appointments.saveAppointments([
      ...current,
      {
        id: tempId, patientId: 1, patient: "John Smith", doctorId: "sarah-johnson", doctor: "Dr. Sarah Johnson",
        department: "Cardiology", date: monday, time: "10:00 AM", reason: "Sync test", symptoms: "", status: "Pending",
      },
    ]);
    // Cancel straight away, before the server has answered: the change
    // must still reach the real row once the booking has an id.
    appointments.updateAppointment(tempId, { status: "Cancelled" });
    await flushChanges();

    const saved = (await serverAppointments()).find((a) => a.date === monday && a.time === "10:00 AM");
    expect(saved).toMatchObject({ reason: "Sync test", status: "Cancelled", patientId: 1 });
    expect(appointments.loadAppointments().find((a) => a.id === saved.id)?.status).toBe("Cancelled");
  });

  it("submits, edits and deletes feedback", async () => {
    feedback.submitPatientFeedback(
      { id: 1, name: "John Smith" },
      { type: "Suggestion", subject: "Sync subject", message: "Sync message long enough", rating: "4" }
    );
    await flushChanges();

    let mine = (await api.get("/feedback")).feedback.find((f) => f.subject === "Sync subject");
    expect(mine).toMatchObject({ type: "Suggestion", rating: 4, priority: "Low" });

    const localId = feedback.getPatientFeedback(1).find((f) => f.subject === "Sync subject").id;
    feedback.updatePatientFeedback(localId, { type: "Complaint", subject: "Sync subject", message: "Changed message here", rating: "1" });
    await flushChanges();

    mine = (await api.get("/feedback")).feedback.find((f) => f.id === mine.id);
    expect(mine).toMatchObject({ type: "Complaint", priority: "High", message: "Changed message here" });

    feedback.deletePatientFeedback(localId);
    await flushChanges();
    expect((await api.get("/feedback")).feedback.some((f) => f.id === mine.id)).toBe(false);
  });

  it("tells the user and restores the server data when a change is rejected", async () => {
    const events = [];
    const listener = (event) => events.push(event.detail.message);

    window.addEventListener(SYNC_ERROR_EVENT, listener);

    const before = appointments.loadAppointments().length;

    appointments.saveAppointments([
      ...appointments.loadAppointments(),
      {
        id: 9999, patientId: 1, patient: "John Smith", doctorId: "sarah-johnson", doctor: "Dr. Sarah Johnson",
        department: "Cardiology", date: "2020-01-06", time: "10:00 AM", reason: "In the past", symptoms: "", status: "Pending",
      },
    ]);
    await flushChanges();
    window.removeEventListener(SYNC_ERROR_EVENT, listener);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatch(/past/i);
    expect(appointments.loadAppointments().some((a) => a.id === 9999)).toBe(false);
    expect(appointments.loadAppointments().length).toBe(before);
  });

  it("lets a doctor add a diagnosis that persists", async () => {
    await signIn("doctor@test.com", "doctor");

    const clinical = await import("../../src/data/clinicalData.js");
    const updated = clinical.addClinicalEntry(1, "diagnoses", {
      date: new Date().toISOString().slice(0, 10), diagnosis: "Sync Diagnosis", notes: "From the data layer",
      status: "Active", doctor: "Dr. Sarah Johnson", department: "Cardiology",
    });

    expect(updated.diagnoses[0].diagnosis).toBe("Sync Diagnosis");
    await flushChanges();

    await signIn("patient@test.com", "patient");
    expect(clinical.loadClinicalRecord(1).diagnoses.map((d) => d.diagnosis)).toContain("Sync Diagnosis");
  });

  it("saves a doctor's availability", async () => {
    await signIn("doctor@test.com", "doctor");

    const original = doctors.loadAvailability("sarah-johnson");

    doctors.saveAvailability("sarah-johnson", [{ id: 1, day: "Friday", startTime: "10:00", endTime: "11:00", status: "Available" }]);
    await flushChanges();

    const fresh = (await api.get("/bootstrap")).availability["sarah-johnson"];
    expect(fresh).toEqual([{ id: 1, day: "Friday", startTime: "10:00", endTime: "11:00", status: "Available" }]);

    // Put the demo schedule back so other tests still see it.
    doctors.saveAvailability("sarah-johnson", original);
    await flushChanges();
    expect((await api.get("/bootstrap")).availability["sarah-johnson"]).toEqual(original);
  });

  it("lets an administrator change a user's status and review an application", async () => {
    await signIn("admin@test.com", "admin");

    const admin = await import("../../src/data/adminData.js");
    const users = admin.loadUsers();
    const target = users.find((u) => u.email === "emily.johnson@example.com");

    storage.saveStored(
      "healthcare_admin_users",
      users.map((u) => (u.id === target.id ? { ...u, status: "Inactive" } : u))
    );

    const apps = admin.loadApplications();
    storage.saveStored(
      "healthcare_admin_applications",
      apps.map((a) => (a.id === "APP-1002" ? { ...a, status: "Approved", reviewNote: "ok" } : a))
    );
    await flushChanges();

    const boot = await api.get("/bootstrap");
    expect(boot.users.find((u) => u.id === target.id).status).toBe("Inactive");
    expect(boot.applications.find((a) => a.id === "APP-1002").status).toBe("Approved");
    expect(boot.users.some((u) => u.email === "omar.haddad@example.com")).toBe(true);
    // Approval reloaded the data, so a new doctor is available to patients.
    expect(doctors.DOCTORS.some((d) => d.id === "omar-haddad")).toBe(true);
  });
});
