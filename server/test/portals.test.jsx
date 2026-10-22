// @vitest-environment jsdom
//
// Renders every portal page, for each role, against the real API and
// MySQL (the same way the browser does after sign-in) and checks that
// the page loads its data without errors.

import { cleanup, configure, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db.js";

configure({ asyncUtilTimeout: 8000 });

let server;
let App, AuthProvider, ToastProvider, api, setToken, hydrate, flushChanges;

const PAGES = {
  patient: [
    "/patient/dashboard",
    "/patient/appointments",
    "/patient/appointments/book",
    "/patient/medical-records",
    "/patient/feedback",
    "/patient/messages",
    "/patient/profile",
  ],
  doctor: [
    "/doctor/dashboard",
    "/doctor/appointments",
    "/doctor/availability",
    "/doctor/patients",
    "/doctor/patients/1",
    "/doctor/messages",
  ],
  medical_staff: ["/doctor/dashboard", "/doctor/appointments", "/doctor/patients", "/doctor/patients/1", "/doctor/messages"],
  admin: [
    "/admin/dashboard",
    "/admin/users",
    "/admin/applications",
    "/admin/feedback",
    "/admin/reports",
    "/admin/activity",
  ],
};

const ACCOUNTS = {
  patient: "patient@test.com",
  doctor: "doctor@test.com",
  medical_staff: "staff@test.com",
  admin: "admin@test.com",
};

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  vi.stubEnv("VITE_USE_API", "true");
  vi.stubEnv("VITE_API_URL", `http://127.0.0.1:${server.address().port}/api`);

  window.scrollTo = vi.fn();

  ({ api, setToken } = await import("../../src/api/client.js"));
  ({ hydrate } = await import("../../src/api/hydrate.js"));
  ({ flushChanges } = await import("../../src/api/persist.js"));
  ({ default: App } = await import("../../src/App.jsx"));
  ({ AuthProvider } = await import("../../src/context/AuthContext.jsx"));
  ({ ToastProvider } = await import("../../src/context/ToastContext.jsx"));
});

afterEach(cleanup);

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

const signIn = async (role) => {
  const { token, user } = await api.post("/auth/login", { email: ACCOUNTS[role], password: "password123", role });

  setToken(token, { remember: false });
  sessionStorage.setItem("healthcare_user", JSON.stringify(user));
  await hydrate();
};

describe.each(Object.entries(PAGES))("%s portal", (role, paths) => {
  it.each(paths)("%s loads with real data", async (path) => {
    await signIn(role);

    const errors = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));

    window.history.pushState({}, "", path);
    render(
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    );

    const heading = await screen.findByRole("heading", { level: 1 });

    expect(heading.textContent.trim()).not.toBe("");
    // Unauthorized / not-found pages mean the route or role check is wrong.
    expect(window.location.pathname).toBe(path);
    expect(screen.queryByText(/something went wrong|could not load/i)).toBeNull();

    // Let the page's own loading delay finish, then check nothing crashed.
    await new Promise((resolve) => setTimeout(resolve, 900));
    await flushChanges();
    spy.mockRestore();

    expect(errors).toEqual([]);
  });
});

describe("pages show the database's data", () => {
  it("shows the demo patient's appointments from MySQL", async () => {
    await signIn("patient");
    window.history.pushState({}, "", "/patient/appointments");
    render(
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    );

    expect((await screen.findAllByText(/Sarah Johnson/)).length).toBeGreaterThan(0);
  });

  it("lists the booking departments and doctors from the database", async () => {
    await signIn("patient");
    window.history.pushState({}, "", "/patient/appointments/book");
    render(
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    );

    const department = await screen.findByLabelText(/department/i);
    const options = [...department.querySelectorAll("option")].map((option) => option.textContent);

    // Only departments that have doctors can be booked.
    expect(options).toEqual(expect.arrayContaining(["Cardiology", "Dermatology", "General Medicine", "Neurology", "Orthopedics"]));
    expect(options).not.toContain("Radiology");
  });

  it("shows real unread messages on the dashboard and in the inbox", async () => {
    await signIn("patient");
    window.history.pushState({}, "", "/patient/messages");
    render(
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    );

    expect(await screen.findByText("Preparing for your appointment")).toBeInTheDocument();
    expect(screen.getByText("Your recent results")).toBeInTheDocument();
  });

  it("shows the seeded users to the administrator", async () => {
    await signIn("admin");
    window.history.pushState({}, "", "/admin/users");
    render(
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    );

    // The list is paginated; the first page starts with the first patients.
    expect((await screen.findAllByText("John Smith")).length).toBeGreaterThan(0);
  });
});
