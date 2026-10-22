// W115 – Regression: every page for every role renders its main
// heading without React errors or warnings.

import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./renderApp";

const PAGES = {
  patient: [
    ["/patient/dashboard", /patient dashboard/i],
    ["/patient/appointments", /appointments/i],
    ["/patient/appointments/book", /book appointment/i],
    ["/patient/appointments/2/reschedule", /reschedule appointment/i],
    ["/patient/medical-records", /medical records/i],
    ["/patient/feedback", /feedback/i],
    ["/patient/profile", /my profile/i],
  ],
  doctor: [
    ["/doctor/dashboard", /dashboard/i],
    ["/doctor/appointments", /appointments/i],
    ["/doctor/availability", /availability/i],
    ["/doctor/patients", /patients/i],
    ["/doctor/patients/1", /patient medical record/i],
    ["/doctor/patients/1/diagnosis", /patient medical record/i],
    ["/doctor/patients/1/prescription", /patient medical record/i],
    ["/doctor/patients/1/status", /patient medical record/i],
  ],
  medical_staff: [
    ["/doctor/dashboard", /dashboard/i],
    ["/doctor/appointments", /appointments/i],
    ["/doctor/availability", /availability/i],
  ],
  admin: [
    ["/admin/dashboard", /admin dashboard/i],
    ["/admin/users", /user management/i],
    ["/admin/applications", /application approval/i],
    ["/admin/feedback", /feedback management/i],
    ["/admin/reports", /reports/i],
    ["/admin/activity", /activity monitoring/i],
  ],
};

const PUBLIC_PAGES = [
  ["/login", /welcome back/i, 2],
  ["/login/doctor", /sign in as doctor/i, 2],
  ["/register", /create your account/i, 2],
  ["/forgot-password", /forgot password/i, 2],
  ["/reset-password?token=demo", /reset password/i, 2],
  ["/unauthorized", /access denied/i, 1],
  ["/no-such-page", /page not found/i, 1],
];

let consoleErrors;

beforeEach(() => {
  consoleErrors = [];
  vi.spyOn(console, "error").mockImplementation((...args) => {
    consoleErrors.push(args.join(" "));
  });
  vi.spyOn(console, "warn").mockImplementation((...args) => {
    consoleErrors.push(args.join(" "));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("W115 regression – portal pages", () => {
  for (const [role, pages] of Object.entries(PAGES)) {
    for (const [path, heading] of pages) {
      it(`${role}: ${path} renders without errors`, async () => {
        renderApp(path, { role });

        expect(
          await screen.findByRole("heading", { level: 1, name: heading })
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe(path);
        expect(document.title).toMatch(/Healthcare Management System$/);
        expect(consoleErrors).toEqual([]);
      });
    }
  }
});

describe("W115 regression – public pages", () => {
  for (const [path, heading, level] of PUBLIC_PAGES) {
    it(`${path} renders without errors`, async () => {
      renderApp(path);

      expect(
        await screen.findByRole("heading", { level, name: heading })
      ).toBeInTheDocument();
      expect(consoleErrors).toEqual([]);
    });
  }
});
