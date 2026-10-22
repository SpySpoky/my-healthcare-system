// W112 – Admin user, application, feedback, report and activity pages.

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadActivity,
  loadApplications,
  loadFeedback,
  loadUsers,
} from "../data/adminData";
import { authenticate } from "../data/authData";
import { getPatientFeedback } from "../data/feedbackData";
import { getPatientByEmail } from "../data/patientsData";
import { findPageHeading, renderApp } from "./renderApp";

const fieldError = (field) =>
  document.getElementById(field.getAttribute("aria-describedby"))?.textContent;

const userByEmail = (email) =>
  loadUsers().find((account) => account.email === email);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("W112 admin dashboard", () => {
  it("shows live KPIs from the shared data", async () => {
    renderApp("/admin/dashboard", { role: "admin" });
    await findPageHeading(/admin dashboard/i);

    const kpi = (label) =>
      screen.getByText(label, { selector: "p" }).parentElement.textContent;

    expect(kpi("Total Users")).toContain(String(loadUsers().length));
    expect(kpi("Pending Applications")).toContain(
      String(loadApplications().filter((item) => item.status === "Pending").length)
    );
  });
});

describe("W112 user management", () => {
  it("searches, filters and paginates users", async () => {
    const { user } = renderApp("/admin/users", { role: "admin" });
    await findPageHeading(/user management/i);

    // 8 per page
    expect(screen.getAllByRole("row")).toHaveLength(9);
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "doctor");
    const doctorCount = loadUsers().filter((account) => account.role === "doctor").length;
    expect(screen.getAllByRole("row")).toHaveLength(doctorCount + 1);

    await user.clear(screen.getByRole("searchbox"));
    await user.selectOptions(screen.getByLabelText(/^status/i), "Inactive");
    const inactive = loadUsers().filter((account) => account.status === "Inactive").length;
    expect(screen.getAllByRole("row")).toHaveLength(inactive + 1);

    await user.type(screen.getByRole("searchbox"), "no-such-user");
    expect(screen.getByText(/no users match/i)).toBeInTheDocument();
  });

  it("validates and saves edits, keeping the patient record in sync", async () => {
    const { user } = renderApp("/admin/users", { role: "admin" });
    await findPageHeading(/user management/i);

    const row = screen.getAllByRole("row").find((item) => item.textContent.includes("Emily Johnson"));
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");

    const email = within(dialog).getByLabelText(/^email/i);
    await user.clear(email);
    await user.type(email, "patient@test.com");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));
    expect(fieldError(email)).toMatch(/already uses this email/i);

    await user.clear(email);
    await user.type(email, "not-an-email");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));
    expect(fieldError(email)).toMatch(/valid email/i);

    await user.clear(email);
    await user.type(email, "emily.j@example.com");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(userByEmail("emily.j@example.com").name).toBe("Emily Johnson");
    expect(getPatientByEmail("emily.j@example.com")?.name).toBe("Emily Johnson");
  });

  it("deactivates an account (which can then no longer sign in) and protects the admin's own account", async () => {
    const { user } = renderApp("/admin/users", { role: "admin" });
    await findPageHeading(/user management/i);

    const row = screen.getAllByRole("row").find((item) => item.textContent.includes("Emily Johnson"));
    await user.click(within(row).getByRole("button", { name: "Deactivate" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(userByEmail("emily.johnson@example.com").status).toBe("Inactive"));
    expect(authenticate({ role: "patient", email: "emily.johnson@example.com" }).error).toMatch(/inactive/i);

    await user.type(screen.getByRole("searchbox"), "admin@test.com");
    const ownRow = screen.getAllByRole("row")[1];
    expect(within(ownRow).getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });
});

describe("W112 application approval", () => {
  it("requires a reason to reject and creates an account on approval", async () => {
    const { user } = renderApp("/admin/applications", { role: "admin" });
    await findPageHeading(/application approval/i);

    expect(screen.getByRole("tab", { name: /pending\s*4/i })).toHaveAttribute("aria-selected", "true");

    // Reject without a reason
    await user.click(screen.getAllByRole("button", { name: /review application/i })[0]);
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/reason for rejection/i);

    // Approve
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(loadApplications().find((item) => item.id === "APP-1001").status).toBe("Approved")
    );
    expect(screen.getByRole("tab", { name: /approved/i })).toHaveAttribute("aria-selected", "true");
    expect(userByEmail("hannah.lee@example.com")).toMatchObject({ role: "doctor", status: "Active" });

    // Reject with a reason
    await user.click(screen.getByRole("tab", { name: /pending/i }));
    await user.click(screen.getAllByRole("button", { name: /review application/i })[0]);
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/review note/i), "License could not be verified.");
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(loadApplications().find((item) => item.id === "APP-1002")).toMatchObject({
        status: "Rejected",
        reviewNote: "License could not be verified.",
      })
    );
  });
});

describe("W112 feedback management", () => {
  it("requires a response to resolve and the patient sees the reply", async () => {
    const { user } = renderApp("/admin/feedback", { role: "admin" });
    await findPageHeading(/feedback management/i);

    expect(screen.getByText(/select a feedback item/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /long waiting time/i }));

    const form = screen.getByRole("button", { name: /save changes/i }).closest("form");
    await user.selectOptions(within(form).getByLabelText(/status/i), "Resolved");
    await user.click(within(form).getByRole("button", { name: /save changes/i }));
    expect(within(form).getByRole("alert")).toHaveTextContent(/write a response/i);

    await user.type(
      within(form).getByLabelText(/response to patient/i),
      "We are sorry for the wait and have reviewed clinic scheduling."
    );
    await user.click(within(form).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(loadFeedback().find((item) => item.id === "FB-2001").status).toBe("Resolved")
    );
    expect(getPatientFeedback(1).find((item) => item.id === "FB-2001")).toMatchObject({
      status: "Reviewed",
      response: "We are sorry for the wait and have reviewed clinic scheduling.",
    });
  });

  it("filters the inbox", async () => {
    const { user } = renderApp("/admin/feedback", { role: "admin" });
    await findPageHeading(/feedback management/i);

    await user.selectOptions(screen.getByLabelText(/^type/i), "Complaint");
    const complaints = loadFeedback().filter((item) => item.type === "Complaint");
    for (const item of complaints) {
      expect(screen.getByRole("button", { name: new RegExp(item.subject, "i") })).toBeInTheDocument();
    }

    await user.type(screen.getByRole("searchbox"), "no-such-feedback");
    expect(screen.getByText(/no feedback found/i)).toBeInTheDocument();
  });
});

describe("W112 reports", () => {
  it("changes the period and exports a CSV", async () => {
    const createObjectURL = vi.fn(() => "blob:report");
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { user } = renderApp("/admin/reports", { role: "admin" });
    await findPageHeading(/reports/i);

    const total = () => screen.getByText("Appointments", { selector: "p" }).parentElement.textContent;
    const sixMonths = total();
    await user.selectOptions(screen.getByLabelText(/period/i), "3");
    expect(total()).not.toBe(sixMonths);

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalled();
    expect(await screen.findByText(/report exported/i)).toBeInTheDocument();
    expect(loadActivity()[0].action).toMatch(/exported report/i);
  });
});

describe("W112 activity monitoring", () => {
  it("filters the log and validates the date range", async () => {
    const { user } = renderApp("/admin/activity", { role: "admin" });
    await findPageHeading(/activity monitoring/i);

    await user.selectOptions(screen.getByLabelText(/^status/i), "Failed");
    const failed = loadActivity().filter((entry) => entry.status === "Failed").length;
    expect(screen.getAllByRole("row")).toHaveLength(failed + 1);

    fireEvent.change(screen.getByLabelText(/^from/i), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText(/^to/i), { target: { value: "2026-01-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/start date must be before/i);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    await user.type(screen.getByRole("searchbox"), "no-such-activity");
    expect(screen.getByText(/no activity found/i)).toBeInTheDocument();
  });
});
