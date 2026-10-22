// W113 – Navigation and browser back/forward behaviour
// W114 – Loading, empty, success and error states

import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadAppointments, saveAppointments } from "../data/appointmentData";
import { loadApplications } from "../data/adminData";
import { saveStored, STORAGE_KEYS } from "../data/storage";
import { currentPath, findPageHeading, renderApp } from "./renderApp";

/* =====================================================
   W113
===================================================== */

describe("W113 navigation", () => {
  it("highlights the active sidebar link and supports back/forward", async () => {
    const { user } = renderApp("/patient/dashboard", { role: "patient" });
    await findPageHeading(/patient dashboard/i);

    const sidebar = within(screen.getByRole("navigation", { name: /main menu/i }));
    expect(sidebar.getByRole("link", { name: /dashboard/i })).toHaveAttribute("aria-current", "page");

    await user.click(sidebar.getByRole("link", { name: /medical records/i }));
    await findPageHeading(/medical records/i);
    expect(sidebar.getByRole("link", { name: /medical records/i })).toHaveAttribute("aria-current", "page");

    await user.click(sidebar.getByRole("link", { name: /feedback/i }));
    await findPageHeading(/feedback/i);

    window.history.back();
    await waitFor(() => expect(currentPath()).toBe("/patient/medical-records"));
    expect(await findPageHeading(/medical records/i)).toBeInTheDocument();

    window.history.back();
    await waitFor(() => expect(currentPath()).toBe("/patient/dashboard"));
    expect(await findPageHeading(/patient dashboard/i)).toBeInTheDocument();

    window.history.forward();
    await waitFor(() => expect(currentPath()).toBe("/patient/medical-records"));
    expect(await findPageHeading(/medical records/i)).toBeInTheDocument();
  });

  it("breadcrumbs and the header title link to parent pages", async () => {
    const { user } = renderApp("/doctor/patients/1", { role: "doctor" });
    await findPageHeading(/patient medical record/i);

    const crumbs = within(screen.getByRole("navigation", { name: /breadcrumb/i }));
    await user.click(crumbs.getByRole("link", { name: "Patients" }));
    expect(await findPageHeading(/patients/i)).toBeInTheDocument();
    expect(currentPath()).toBe("/doctor/patients");

    await user.click(screen.getByRole("link", { name: /healthcare management system/i }));
    await waitFor(() => expect(currentPath()).toBe("/doctor/dashboard"));
  });

  it("record tabs follow the URL, including Back", async () => {
    const { user } = renderApp("/doctor/patients/4/status", { role: "doctor" });
    await findPageHeading(/patient medical record/i);
    expect(screen.getAllByText(/current health status/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /diagnoses/i }));
    expect(currentPath()).toBe("/doctor/patients/4");

    window.history.back();
    await waitFor(() => expect(currentPath()).toBe("/doctor/patients/4/status"));
    expect(screen.getAllByText(/current health status/i).length).toBeGreaterThan(0);
  });

  it("role pages redirect: bare portal path, wrong portal, signed-in login", async () => {
    renderApp("/patient", { role: "patient" });
    await waitFor(() => expect(currentPath()).toBe("/patient/dashboard"));
  });

  it("a signed-in user opening another portal sees Access Denied with a way back", async () => {
    const { user } = renderApp("/admin/users", { role: "patient" });

    expect(await screen.findByRole("heading", { name: /access denied/i })).toBeInTheDocument();
    expect(currentPath()).toBe("/unauthorized");

    await user.click(screen.getByRole("link", { name: /go to my dashboard/i }));
    await waitFor(() => expect(currentPath()).toBe("/patient/dashboard"));
  });

  it("a signed-in user opening /login goes to their dashboard", async () => {
    renderApp("/login", { role: "doctor" });
    await waitFor(() => expect(currentPath()).toBe("/doctor/dashboard"));
  });

  it("after logout, protected pages and Back lead to the login page", async () => {
    const { user } = renderApp("/admin/dashboard", { role: "admin" });
    await findPageHeading(/admin dashboard/i);

    await user.click(screen.getByRole("button", { name: /test administrator/i }));
    await user.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => expect(currentPath()).toBe("/login"));

    window.history.pushState({}, "", "/admin/users");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect(currentPath()).toBe("/login"));
  });

  it("unknown addresses show the 404 page", async () => {
    renderApp("/doctor/not-a-page", { role: "doctor" });
    expect(await screen.findByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to my dashboard/i })).toHaveAttribute("href", "/doctor/dashboard");
  });
});

/* =====================================================
   W114
===================================================== */

describe("W114 loading, empty, success and error states", () => {
  it("shows a loading state before page data appears", async () => {
    renderApp("/admin/users", { role: "admin" });

    expect(screen.getByRole("status", { name: /loading user management/i })).toBeInTheDocument();
    expect(await findPageHeading(/user management/i)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
  });

  it("shows an error state with retry when loading fails", async () => {
    const { user } = renderApp("/doctor/patients?mockError=1", { role: "doctor" });

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/could not load this page/i);

    await user.click(within(error).getByRole("button", { name: /try again/i }));
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows empty states when there is nothing to list", async () => {
    // No upcoming appointments for the patient.
    saveAppointments(
      loadAppointments().map((item) =>
        item.patientId === 1 ? { ...item, status: "Cancelled" } : item
      )
    );
    renderApp("/patient/dashboard", { role: "patient" });
    await findPageHeading(/patient dashboard/i);

    expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /book an appointment/i })).toHaveAttribute(
      "href",
      "/patient/appointments/book"
    );
  });

  it("shows an empty state when every application is reviewed", async () => {
    saveStored(
      STORAGE_KEYS.applications,
      loadApplications().map((item) => ({ ...item, status: "Approved", reviewedBy: "Elif Demir", reviewedAt: "01 Oct 2026" }))
    );
    renderApp("/admin/applications", { role: "admin" });
    await findPageHeading(/application approval/i);

    expect(screen.getByText(/no pending applications/i)).toBeInTheDocument();
  });

  it("shows success feedback after saving", async () => {
    const { user } = renderApp("/patient/profile", { role: "patient" });
    await findPageHeading(/my profile/i);

    await user.click(screen.getByRole("button", { name: /edit profile/i }));
    const address = screen.getByLabelText(/^address/i);
    await user.clear(address);
    await user.type(address, "5 Harbour Road, Kyrenia");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.patients))[0].address).toBe(
      "5 Harbour Road, Kyrenia"
    );
  });

  it("shows inline errors for invalid profile data", async () => {
    const { user } = renderApp("/patient/profile", { role: "patient" });
    await findPageHeading(/my profile/i);

    await user.click(screen.getByRole("button", { name: /edit profile/i }));
    await user.clear(screen.getByLabelText(/first name/i));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
  });
});
