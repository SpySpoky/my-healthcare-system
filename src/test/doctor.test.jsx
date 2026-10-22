// W110 – Doctor schedule and availability UI
// W111 – Doctor patient-record interactions

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TIME_SLOTS, loadAppointments } from "../data/appointmentData";
import { loadClinicalRecord } from "../data/clinicalData";
import { getDoctorTimesForDate, loadAvailability } from "../data/doctorsData";
import { getRelativeDate } from "../utils/date";
import { currentPath, findPageHeading, renderApp } from "./renderApp";

const appointment = (id) => loadAppointments().find((item) => item.id === id);

// Tab buttons read like "📅 Today 4".
const tabButton = (label) =>
  screen
    .getAllByRole("button")
    .find((button) => new RegExp(`^\\W*${label}\\s*\\d+$`, "i").test(button.textContent.trim()));

/* =====================================================
   W110 – schedule
===================================================== */

describe("W110 doctor dashboard and appointments", () => {
  it("dashboard shows today's schedule from the shared appointments", async () => {
    renderApp("/doctor/dashboard", { role: "doctor" });
    await findPageHeading(/dashboard/i);

    const main = within(screen.getByRole("main"));
    for (const name of ["John Smith", "Emily Johnson", "Michael Brown", "Sarah Wilson"]) {
      expect(main.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(main.getByText(/welcome back, dr\. sarah johnson/i)).toBeInTheDocument();
  });

  it("filters appointments by Today, Upcoming, Completed and Cancelled", async () => {
    const { user } = renderApp("/doctor/appointments", { role: "doctor" });
    await findPageHeading(/appointments/i);

    const today = getRelativeDate(0);
    const mine = loadAppointments().filter((item) => item.doctorId === "sarah-johnson");

    await user.click(tabButton("Today"));
    expect(screen.getAllByRole("row")).toHaveLength(
      mine.filter((item) => item.date === today).length + 1
    );

    await user.click(tabButton("Completed"));
    expect(screen.getAllByRole("row")).toHaveLength(
      mine.filter((item) => item.status === "Completed").length + 1
    );

    await user.click(tabButton("Cancelled"));
    expect(screen.getAllByRole("row")).toHaveLength(
      mine.filter((item) => item.status === "Cancelled").length + 1
    );
  });

  it("confirms, completes and cancels appointments", async () => {
    const { user } = renderApp("/doctor/appointments", { role: "doctor" });
    await findPageHeading(/appointments/i);
    await user.click(tabButton("Today"));

    const rowFor = (name) =>
      screen.getAllByRole("row").find((row) => row.textContent.includes(name));

    // Pending -> Confirmed (Michael Brown, today)
    await user.click(within(rowFor("Michael Brown")).getByRole("button", { name: "Confirm" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/confirm appointment/i);
    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(appointment(3).status).toBe("Confirmed"));

    // Confirmed today -> Completed (John Smith)
    await user.click(within(rowFor("John Smith")).getByRole("button", { name: "Complete" }));
    dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /mark completed/i }));
    await waitFor(() => expect(appointment(1).status).toBe("Completed"));

    // "Back" keeps the appointment; confirming cancels it (Sarah Wilson)
    await user.click(within(rowFor("Sarah Wilson")).getByRole("button", { name: "Cancel" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Back" }));
    expect(appointment(4).status).toBe("Confirmed");

    await user.click(within(rowFor("Sarah Wilson")).getByRole("button", { name: "Cancel" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancel appointment/i })
    );
    await waitFor(() => expect(appointment(4).status).toBe("Cancelled"));
    expect(await screen.findByText(/sarah wilson cancelled/i)).toBeInTheDocument();
  });

  it("medical staff see every doctor's appointments", async () => {
    const { user } = renderApp("/doctor/appointments", { role: "medical_staff" });
    await findPageHeading(/appointments/i);
    await user.click(tabButton("Completed"));

    expect(screen.getAllByRole("row")).toHaveLength(
      loadAppointments().filter((item) => item.status === "Completed").length + 1
    );
  });
});

/* =====================================================
   W110 – availability
===================================================== */

describe("W110 doctor availability", () => {
  const openAddForm = async (user) => {
    await user.click(screen.getAllByRole("button", { name: /add availability|add slot/i })[0]);
    return screen.findByRole("dialog", { name: /add availability slot/i });
  };

  it("validates time order and overlapping slots", async () => {
    const { user } = renderApp("/doctor/availability", { role: "doctor" });
    await findPageHeading(/availability/i);

    let dialog = await openAddForm(user);
    await user.selectOptions(within(dialog).getByLabelText(/day/i), "Monday");
    fireEvent.change(within(dialog).getByLabelText(/start/i), { target: { value: "15:00" } });
    fireEvent.change(within(dialog).getByLabelText(/end/i), { target: { value: "14:00" } });
    await user.click(within(dialog).getByRole("button", { name: /add slot/i }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/end time must be later/i);

    fireEvent.change(within(dialog).getByLabelText(/start/i), { target: { value: "10:00" } });
    fireEvent.change(within(dialog).getByLabelText(/end/i), { target: { value: "11:00" } });
    await user.click(within(dialog).getByRole("button", { name: /add slot/i }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/overlaps/i);
  });

  it("adds a slot that patients can then book", async () => {
    const { user } = renderApp("/doctor/availability", { role: "doctor" });
    await findPageHeading(/availability/i);

    const dialog = await openAddForm(user);
    await user.selectOptions(within(dialog).getByLabelText(/day/i), "Saturday");
    fireEvent.change(within(dialog).getByLabelText(/start/i), { target: { value: "09:00" } });
    fireEvent.change(within(dialog).getByLabelText(/end/i), { target: { value: "12:00" } });
    await user.click(within(dialog).getByRole("button", { name: /add slot/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /add availability slot/i })).not.toBeInTheDocument()
    );
    expect(
      loadAvailability("sarah-johnson").some(
        (slot) => slot.day === "Saturday" && slot.startTime === "09:00" && slot.endTime === "12:00"
      )
    ).toBe(true);

    let saturday = null;
    for (let offset = 1; offset <= 7 && !saturday; offset += 1) {
      const date = getRelativeDate(offset);
      if (new Date(`${date}T00:00:00`).getDay() === 6) saturday = date;
    }
    expect(getDoctorTimesForDate("sarah-johnson", saturday, TIME_SLOTS)).toContain("09:00 AM");
  });

  it("edits, disables and removes a slot", async () => {
    const { user } = renderApp("/doctor/availability", { role: "doctor" });
    await findPageHeading(/availability/i);

    const before = loadAvailability("sarah-johnson");
    const mondaySlots = before.filter((slot) => slot.day === "Monday");
    await user.click(screen.getAllByRole("button", { name: /^monday/i })[0]);

    const slotGroup = screen.getByRole("group", {
      name: `Monday ${mondaySlots[0].startTime} to ${mondaySlots[0].endTime}`,
    });

    await user.click(within(slotGroup).getByRole("button", { name: /disable/i }));
    expect(loadAvailability("sarah-johnson").find((slot) => slot.id === mondaySlots[0].id).status).not.toBe(
      "Available"
    );

    await user.click(within(slotGroup).getByRole("button", { name: /remove/i }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: /remove slot/i }));

    await waitFor(() =>
      expect(loadAvailability("sarah-johnson").some((slot) => slot.id === mondaySlots[0].id)).toBe(false)
    );
  });

  it("medical staff see an explanation instead of a schedule", async () => {
    renderApp("/doctor/availability", { role: "medical_staff" });
    expect(await screen.findByText(/availability is managed by doctors/i)).toBeInTheDocument();
  });
});

/* =====================================================
   W111 – patients and patient record
===================================================== */

describe("W111 doctor patients list", () => {
  it("searches and filters patients with an empty state", async () => {
    const { user } = renderApp("/doctor/patients", { role: "doctor" });
    await findPageHeading(/patients/i);

    const search = screen.getByRole("textbox", { name: /search/i }) || screen.getByPlaceholderText(/search/i);
    await user.type(search, "Emily");
    expect(screen.getAllByText("Emily Johnson").length).toBeGreaterThan(0);
    expect(screen.queryByText("John Smith")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "zzzz");
    expect(screen.getByText(/no patients found/i)).toBeInTheDocument();
  });

  it("opens a patient's record", async () => {
    const { user } = renderApp("/doctor/patients", { role: "doctor" });
    await findPageHeading(/patients/i);

    await user.click(screen.getAllByRole("link", { name: /view/i }).find((link) => link.getAttribute("href") === "/doctor/patients/1"));
    expect(await findPageHeading(/patient medical record/i)).toBeInTheDocument();
    expect(currentPath()).toBe("/doctor/patients/1");
  });
});

describe("W111 patient record", () => {
  it("shows the patient's details and records", async () => {
    const { user } = renderApp("/doctor/patients/1", { role: "doctor" });
    await findPageHeading(/patient medical record/i);
    const main = within(screen.getByRole("main"));

    expect(main.getAllByText("John Smith").length).toBeGreaterThan(0);
    expect(main.getByText("15 March 1984")).toBeInTheDocument();
    expect(main.getByText("Penicillin")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /diagnoses/i }));
    expect(main.getByText("Tension Headache")).toBeInTheDocument();
  });

  it("adds a diagnosis with validation, saved to the shared record", async () => {
    const { user } = renderApp("/doctor/patients/1", { role: "doctor" });
    await findPageHeading(/patient medical record/i);

    await user.click(screen.getByRole("button", { name: /add diagnosis/i }));
    expect(currentPath()).toBe("/doctor/patients/1/diagnosis");
    const dialog = await screen.findByRole("dialog", { name: /add diagnosis/i });

    await user.click(within(dialog).getByRole("button", { name: /save diagnosis/i }));
    expect(within(dialog).getByText(/diagnosis is required/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/notes are required/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^diagnosis\s*\*?$/i), "Stable Angina");
    fireEvent.change(within(dialog).getByLabelText(/diagnosis date/i), { target: { value: getRelativeDate(3) } });
    await user.type(within(dialog).getByLabelText(/clinical notes/i), "Stress test requested.");
    await user.click(within(dialog).getByRole("button", { name: /save diagnosis/i }));
    expect(within(dialog).getByText(/cannot be in the future/i)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/diagnosis date/i), { target: { value: getRelativeDate(0) } });
    await user.click(within(dialog).getByRole("button", { name: /save diagnosis/i }));

    await waitFor(() => expect(currentPath()).toBe("/doctor/patients/1"));
    expect(screen.getByText("Stable Angina")).toBeInTheDocument();
    expect(loadClinicalRecord(1).diagnoses[0]).toMatchObject({
      diagnosis: "Stable Angina",
      doctor: "Dr. Sarah Johnson",
      department: "Cardiology",
    });
  });

  it("adds a prescription", async () => {
    const { user } = renderApp("/doctor/patients/2/prescription", { role: "doctor" });
    const dialog = await screen.findByRole("dialog", { name: /prescribe medication/i });

    await user.type(within(dialog).getByLabelText(/medication name/i), "Aspirin 75mg");
    await user.type(within(dialog).getByLabelText(/dosage/i), "1 tablet");
    await user.selectOptions(within(dialog).getByLabelText(/frequency/i), "Once daily");
    await user.type(within(dialog).getByLabelText(/duration/i), "30 days");
    fireEvent.change(within(dialog).getByLabelText(/prescription date/i), { target: { value: getRelativeDate(0) } });
    await user.type(within(dialog).getByLabelText(/instructions/i), "Take after breakfast.");
    await user.click(within(dialog).getByRole("button", { name: /save prescription/i }));

    await waitFor(() => expect(currentPath()).toBe("/doctor/patients/2"));
    expect(loadClinicalRecord(2).prescriptions[0]).toMatchObject({
      medication: "Aspirin 75mg",
      frequency: "Once daily",
      status: "Active",
    });
  });

  it("Escape closes the diagnosis dialog", async () => {
    const { user } = renderApp("/doctor/patients/1/diagnosis", { role: "doctor" });
    await screen.findByRole("dialog", { name: /add diagnosis/i });

    await user.keyboard("{Escape}");
    await waitFor(() => expect(currentPath()).toBe("/doctor/patients/1"));
  });

  it("the Status route shows monitoring, flagging readings out of range", async () => {
    const { user } = renderApp("/doctor/patients/4/status", { role: "doctor" });
    await findPageHeading(/patient medical record/i);

    expect(screen.getAllByText(/needs monitoring/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /diagnoses/i }));
    expect(currentPath()).toBe("/doctor/patients/4");
  });

  it("an unknown patient shows a not-found page", async () => {
    renderApp("/doctor/patients/999", { role: "doctor" });
    expect(await findPageHeading(/patient not found/i)).toBeInTheDocument();
  });
});
