// Staff applications, administrator account creation and deletion, and
// vital signs recorded from the patient record.

import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadApplications, loadUsers } from "../data/adminData";
import { authenticate } from "../data/authData";
import { getPatientRecord } from "../data/clinicalData";
import { getPatientByEmail } from "../data/patientsData";
import { findPageHeading, renderApp } from "./renderApp";

const fieldError = (field) =>
  document.getElementById(field.getAttribute("aria-describedby"))?.textContent;

const userByEmail = (email) =>
  loadUsers().find((account) => account.email === email);

// The demo dataset ships with a queue of applications already.
const DEMO_APPLICATIONS = loadApplications().length;

const APPLICANT = {
  fullName: "Dr. Leyla Demir",
  email: "leyla.demir@example.com",
  phone: "+90 555 410 2200",
  licenseNumber: "MD-TR-903311",
  experience: "9",
  qualification: "MD, Cardiology — Ege University",
  documents: [
    new File(["licence"], "Medical license.pdf", { type: "application/pdf" }),
    new File(["cv"], "CV.pdf", { type: "application/pdf" }),
  ],
  password: "Str0ngPass",
};

// Fills the application form with a valid application.
const fillApplication = async (user, overrides = {}) => {
  const values = { ...APPLICANT, ...overrides };

  await user.type(screen.getByLabelText(/full name/i), values.fullName);
  await user.type(screen.getByLabelText(/email address/i), values.email);
  await user.type(screen.getByLabelText(/phone number/i), values.phone);
  await user.selectOptions(screen.getByLabelText(/position/i), "doctor");
  await user.type(screen.getByLabelText(/department/i), "Cardiology");
  await user.type(screen.getByLabelText(/license number/i), values.licenseNumber);
  await user.type(screen.getByLabelText(/years of experience/i), values.experience);
  await user.type(screen.getByLabelText(/qualification/i), values.qualification);
  await user.upload(screen.getByLabelText(/supporting documents/i), values.documents);
  await user.type(screen.getByLabelText(/^password/i), values.password);
  await user.type(screen.getByLabelText(/confirm password/i), values.password);
  await user.click(screen.getByRole("checkbox"));
};

describe("staff application", () => {
  it("is offered on the sign-in page and opens the application form", async () => {
    const { user } = renderApp("/login");

    await user.click(await screen.findByRole("link", { name: /apply for an account/i }));

    expect(
      await screen.findByRole("heading", { name: /apply for a staff account/i })
    ).toBeInTheDocument();
  });

  it("shows an error for every empty field", async () => {
    const { user } = renderApp("/apply");
    await screen.findByRole("heading", { name: /apply for a staff account/i });

    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(fieldError(screen.getByLabelText(/full name/i))).toMatch(/required/i);
    expect(fieldError(screen.getByLabelText(/license number/i))).toMatch(/required/i);
    expect(fieldError(screen.getByLabelText(/qualification/i))).toMatch(/required/i);
    expect(
      document.getElementById("applicantDocuments-error")?.textContent
    ).toMatch(/attach at least one supporting document/i);
    expect(loadApplications()).toHaveLength(DEMO_APPLICATIONS);
  });

  it("sends the application to the administrator's approval queue", async () => {
    const { user } = renderApp("/apply");
    await screen.findByRole("heading", { name: /apply for a staff account/i });

    await fillApplication(user);
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(await screen.findByText(/application submitted/i)).toBeInTheDocument();

    const submitted = loadApplications().find((item) => item.email === APPLICANT.email);

    expect(submitted).toMatchObject({
      name: APPLICANT.fullName,
      role: "doctor",
      department: "Cardiology",
      status: "Pending",
    });
    expect(submitted.documents.map((document) => document.name)).toEqual([
      "Medical license.pdf",
      "CV.pdf",
    ]);

    // No account exists until an administrator approves it.
    expect(userByEmail(APPLICANT.email)).toBeUndefined();
  });

  it("refuses a second application for the same email", async () => {
    const { user } = renderApp("/apply");
    await screen.findByRole("heading", { name: /apply for a staff account/i });

    await fillApplication(user, { email: "hannah.lee@example.com" });
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already waiting for review/i);
    expect(loadApplications()).toHaveLength(DEMO_APPLICATIONS);
  });
});

describe("administrator creates and deletes accounts", () => {
  it("validates the new account and then creates one that can sign in", async () => {
    const { user } = renderApp("/admin/users", { role: "admin" });
    await findPageHeading(/user management/i);

    await user.click(screen.getByRole("button", { name: /add user/i }));
    const dialog = await screen.findByRole("dialog");

    // An email that is already taken, and a weak password.
    await user.type(within(dialog).getByLabelText(/full name/i), "Nurse Aylin Kaya");
    await user.type(within(dialog).getByLabelText(/^email/i), "patient@test.com");
    await user.type(within(dialog).getByLabelText(/^phone/i), "+90 555 410 3300");
    await user.type(within(dialog).getByLabelText(/temporary password/i), "abc");
    await user.click(within(dialog).getByRole("button", { name: /create account/i }));

    expect(fieldError(within(dialog).getByLabelText(/^email/i))).toMatch(/already uses this email/i);
    expect(fieldError(within(dialog).getByLabelText(/temporary password/i))).toMatch(
      /at least 8 characters/i
    );

    const email = within(dialog).getByLabelText(/^email/i);
    await user.clear(email);
    await user.type(email, "aylin.kaya@example.com");

    const password = within(dialog).getByLabelText(/temporary password/i);
    await user.clear(password);
    await user.type(password, "Str0ngPass");

    await user.click(within(dialog).getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const created = userByEmail("aylin.kaya@example.com");

    expect(created).toMatchObject({ name: "Nurse Aylin Kaya", role: "patient", status: "Active" });
    expect(authenticate({ role: "patient", email: "aylin.kaya@example.com" }).error).toBeUndefined();
    expect(getPatientByEmail("aylin.kaya@example.com")).not.toBeNull();
  });

  it("requires a department for a doctor", async () => {
    const { user } = renderApp("/admin/users", { role: "admin" });
    await findPageHeading(/user management/i);

    await user.click(screen.getByRole("button", { name: /add user/i }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/full name/i), "Dr. New Doctor");
    await user.type(within(dialog).getByLabelText(/^email/i), "new.doctor@example.com");
    await user.type(within(dialog).getByLabelText(/^phone/i), "+90 555 410 3301");
    await user.selectOptions(within(dialog).getByLabelText(/^role/i), "doctor");
    await user.type(within(dialog).getByLabelText(/temporary password/i), "Str0ngPass");
    await user.click(within(dialog).getByRole("button", { name: /create account/i }));

    expect(fieldError(within(dialog).getByLabelText(/^department/i))).toMatch(/department is required/i);
  });

  it("deletes an account and protects the administrator's own", async () => {
    const { user } = renderApp("/admin/users", { role: "admin" });
    await findPageHeading(/user management/i);

    await user.type(screen.getByRole("searchbox"), "emily.johnson@example.com");
    const row = screen.getAllByRole("row")[1];

    await user.click(within(row).getByRole("button", { name: "Delete" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" })
    );

    await waitFor(() => expect(userByEmail("emily.johnson@example.com")).toBeUndefined());
    expect(getPatientByEmail("emily.johnson@example.com")).toBeNull();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "admin@test.com");
    const ownRow = screen.getAllByRole("row")[1];

    expect(within(ownRow).getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});

describe("vital signs", () => {
  const openVitalsForm = async (user) => {
    await user.click(await screen.findByRole("button", { name: /record vitals/i }));

    return screen.findByRole("dialog");
  };

  it("records a reading that becomes the patient's current status", async () => {
    const { user } = renderApp("/doctor/patients/1/status", { role: "medical_staff" });
    await findPageHeading(/patient medical record/i);

    const dialog = await openVitalsForm(user);

    await user.clear(within(dialog).getByLabelText(/heart rate/i));
    await user.type(within(dialog).getByLabelText(/heart rate/i), "72");
    await user.type(within(dialog).getByLabelText(/blood pressure/i), "118/76");
    await user.type(within(dialog).getByLabelText(/oxygen saturation/i), "98");
    await user.click(within(dialog).getByRole("button", { name: /save readings/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const record = getPatientRecord(1);

    expect(record.vitals).toMatchObject({ heartRate: "72", bloodPressure: "118/76", oxygen: "98" });
    // The newest reading leads the monitoring history.
    expect(record.monitoringHistory[0]).toMatchObject({ heartRate: "72 bpm" });
    expect(screen.getAllByText("72").length).toBeGreaterThan(0);
  });

  it("validates the readings", async () => {
    const { user } = renderApp("/doctor/patients/1/status", { role: "doctor" });
    await findPageHeading(/patient medical record/i);

    const dialog = await openVitalsForm(user);

    // Nothing entered at all.
    await user.click(within(dialog).getByRole("button", { name: /save readings/i }));
    expect(fieldError(within(dialog).getByLabelText(/heart rate/i))).toMatch(/at least one reading/i);

    await user.type(within(dialog).getByLabelText(/heart rate/i), "900");
    await user.type(within(dialog).getByLabelText(/blood pressure/i), "high");
    await user.click(within(dialog).getByRole("button", { name: /save readings/i }));

    expect(fieldError(within(dialog).getByLabelText(/heart rate/i))).toMatch(/between 20 and 250/i);
    expect(fieldError(within(dialog).getByLabelText(/blood pressure/i))).toMatch(/120\/80/i);
  });
});
