// W107 – Patient appointment interactions
// W108 – Patient medical-record display
// W109 – Patient feedback submission

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadFeedback, saveFeedback } from "../data/adminData";
import {
  TIME_SLOTS,
  getBookedTimes,
  loadAppointments,
} from "../data/appointmentData";
import { addClinicalEntry } from "../data/clinicalData";
import { getDoctorTimesForDate } from "../data/doctorsData";
import { getRelativeDate } from "../utils/date";
import { currentPath, findPageHeading, renderApp } from "./renderApp";

// First future date on which the doctor has a free slot.
const findOpenSlot = (doctorId, ignoreId) => {
  for (let offset = 1; offset < 30; offset += 1) {
    const date = getRelativeDate(offset);
    const booked = getBookedTimes(doctorId, date, ignoreId);
    const time = getDoctorTimesForDate(doctorId, date, TIME_SLOTS).find(
      (slot) => !booked.includes(slot)
    );

    if (time) {
      return { date, time };
    }
  }

  throw new Error(`No free slot for ${doctorId}`);
};

const nextSunday = () => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = getRelativeDate(offset);

    if (new Date(`${date}T00:00:00`).getDay() === 0) {
      return date;
    }
  }

  return null;
};

const fieldError = (field) =>
  document.getElementById(field.getAttribute("aria-describedby"))?.textContent;

const appointment = (id) =>
  loadAppointments().find((item) => item.id === id);

/* =====================================================
   W107
===================================================== */

describe("W107 patient appointments – booking", () => {
  it("validates the booking form", async () => {
    const { user } = renderApp("/patient/appointments/book", { role: "patient" });
    await findPageHeading(/book appointment/i);

    await user.click(screen.getByRole("button", { name: /review appointment/i }));

    expect(fieldError(screen.getByLabelText(/department/i))).toMatch(/select a department/i);
    expect(screen.getByText(/please select a doctor/i)).toBeInTheDocument();
    expect(fieldError(screen.getByLabelText(/reason for appointment/i))).toMatch(/enter a reason/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/fix the highlighted fields/i);
  });

  it("only offers the doctor's free times and rejects past dates", async () => {
    const { user } = renderApp("/patient/appointments/book", { role: "patient" });
    await findPageHeading(/book appointment/i);

    await user.selectOptions(screen.getByLabelText(/department/i), "Cardiology");
    await user.click(screen.getByRole("radio", { name: /dr\. sarah johnson/i }));

    const date = screen.getByLabelText(/appointment date/i);
    expect(date).toHaveAttribute("min", getRelativeDate(0));

    // No working hours on Sunday.
    fireEvent.change(date, { target: { value: nextSunday() } });
    expect(screen.getByText(/no available times/i)).toBeInTheDocument();

    // Already-booked times are not offered.
    const taken = loadAppointments().find(
      (item) =>
        item.doctorId === "sarah-johnson" &&
        item.date > getRelativeDate(0) &&
        item.status !== "Cancelled"
    );
    fireEvent.change(date, { target: { value: taken.date } });
    expect(screen.queryByRole("button", { name: taken.time })).not.toBeInTheDocument();

    // Past dates are rejected on submit.
    fireEvent.change(date, { target: { value: getRelativeDate(-3) } });
    await user.type(screen.getByLabelText(/reason for appointment/i), "Check-up visit");
    await user.click(screen.getByRole("button", { name: /review appointment/i }));
    expect(fieldError(date)).toMatch(/cannot be in the past/i);
  });

  it("books an appointment that the doctor receives as Pending", async () => {
    const slot = findOpenSlot("sarah-johnson");
    const { user } = renderApp("/patient/appointments/book", { role: "patient" });
    await findPageHeading(/book appointment/i);

    await user.selectOptions(screen.getByLabelText(/department/i), "Cardiology");
    await user.click(screen.getByRole("radio", { name: /dr\. sarah johnson/i }));
    fireEvent.change(screen.getByLabelText(/appointment date/i), {
      target: { value: slot.date },
    });
    await user.click(screen.getByRole("button", { name: slot.time }));
    await user.type(screen.getByLabelText(/reason for appointment/i), "Chest pain follow-up");
    await user.click(screen.getByRole("button", { name: /review appointment/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/dr\. sarah johnson/i);
    await user.click(within(dialog).getByRole("button", { name: /confirm appointment/i }));

    expect(await findPageHeading(/appointment requested/i)).toBeInTheDocument();
    expect(loadAppointments().at(-1)).toMatchObject({
      patientId: 1,
      doctorId: "sarah-johnson",
      date: slot.date,
      time: slot.time,
      reason: "Chest pain follow-up",
      status: "Pending",
    });
  });
});

describe("W107 patient appointments – list, details, cancel and reschedule", () => {
  it("shows upcoming, past and cancelled appointments and their details", async () => {
    const { user } = renderApp("/patient/appointments", { role: "patient" });
    await findPageHeading(/appointments/i);

    expect(screen.getByRole("article", { name: /emily brown, skin consultation/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^past/i }));
    expect(screen.getByRole("button", { name: /^past/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("article", { name: /michael smith, follow-up consultation/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cancelled/i }));
    expect(screen.getByRole("article", { name: /sarah johnson, heart check-up/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^upcoming/i }));
    const card = screen.getByRole("article", { name: /emily brown, skin consultation/i });
    await user.click(within(card).getByRole("button", { name: /view details/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/itchy rash|skin consultation/i);
  });

  it("cancels an appointment after confirmation", async () => {
    const { user } = renderApp("/patient/appointments", { role: "patient" });
    await findPageHeading(/appointments/i);

    const card = screen.getByRole("article", { name: /emily brown, skin consultation/i });
    await user.click(within(card).getByRole("button", { name: /^cancel$/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /keep appointment/i }));
    expect(appointment(15).status).toBe("Pending");

    await user.click(within(card).getByRole("button", { name: /^cancel$/i }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: /^cancel appointment$/i })
    );

    expect(await screen.findByText(/cancelled successfully/i)).toBeInTheDocument();
    expect(appointment(15).status).toBe("Cancelled");
    expect(screen.getByRole("button", { name: /^cancelled/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("reschedules an appointment, which returns to Pending", async () => {
    const original = appointment(15);
    const slot = findOpenSlot("emily-brown", 15);
    const { user } = renderApp("/patient/appointments", { role: "patient" });
    await findPageHeading(/appointments/i);

    const card = screen.getByRole("article", { name: /emily brown, skin consultation/i });
    await user.click(within(card).getByRole("button", { name: /reschedule/i }));

    await findPageHeading(/reschedule appointment/i);
    expect(currentPath()).toBe("/patient/appointments/15/reschedule");

    // Choosing the current date and time is rejected.
    fireEvent.change(screen.getByLabelText(/new date/i), { target: { value: original.date } });
    if (screen.queryByRole("button", { name: original.time })) {
      await user.click(screen.getByRole("button", { name: original.time }));
      await user.click(screen.getByRole("button", { name: /review changes/i }));
      expect(screen.getByText(/current appointment time/i)).toBeInTheDocument();
    }

    fireEvent.change(screen.getByLabelText(/new date/i), { target: { value: slot.date } });
    await user.click(screen.getByRole("button", { name: slot.time }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: /confirm reschedule/i })
    );

    expect(await findPageHeading(/appointment rescheduled/i)).toBeInTheDocument();
    expect(appointment(15)).toMatchObject({ date: slot.date, time: slot.time, status: "Pending" });
  });

  it("blocks rescheduling cancelled or other patients' appointments", async () => {
    renderApp("/patient/appointments/18/reschedule", { role: "patient" });
    expect(await screen.findByText(/this appointment is cancelled/i)).toBeInTheDocument();
  });

  it("does not open another patient's appointment", async () => {
    renderApp("/patient/appointments/2/reschedule", { role: "patient" });
    expect(await screen.findByText(/appointment not found/i)).toBeInTheDocument();
  });
});

/* =====================================================
   W108
===================================================== */

describe("W108 patient medical records", () => {
  it("shows the signed-in patient's details and records in every tab", async () => {
    const { user } = renderApp("/patient/medical-records", { role: "patient" });
    await findPageHeading(/medical records/i);

    const main = within(screen.getByRole("main"));
    expect(main.getByText("John Smith")).toBeInTheDocument();
    expect(main.getByText("P-00001")).toBeInTheDocument();
    expect(main.getByText("Penicillin")).toBeInTheDocument();

    const expectations = {
      "Medical History": /follow-up consultation/i,
      Diagnoses: /tension headache/i,
      Prescriptions: /paracetamol 500mg/i,
      Appointments: /heart check-up/i,
      "Medical Notes": /sleep and hydration/i,
    };

    for (const [tab, text] of Object.entries(expectations)) {
      await user.click(screen.getByRole("button", { name: tab }));
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it("shows entries added by a doctor", async () => {
    addClinicalEntry(1, "diagnoses", {
      date: getRelativeDate(0),
      diagnosis: "Stable Angina",
      notes: "Stress test requested.",
      status: "Active",
      doctor: "Dr. Sarah Johnson",
      department: "Cardiology",
    });

    const { user } = renderApp("/patient/medical-records", { role: "patient" });
    await findPageHeading(/medical records/i);
    await user.click(screen.getByRole("button", { name: "Diagnoses" }));

    expect(screen.getByText("Stable Angina")).toBeInTheDocument();
  });

  it("searches across records and shows an empty state when nothing matches", async () => {
    const { user } = renderApp("/patient/medical-records", { role: "patient" });
    await findPageHeading(/medical records/i);
    const search = screen.getByRole("searchbox", { name: /search medical records/i });

    await user.type(search, "Vitamin D");
    expect(screen.getAllByText(/vitamin d/i).length).toBeGreaterThan(0);

    await user.clear(search);
    await user.type(search, "zzzz-no-match");
    expect(screen.getAllByText(/no .*found|no matching/i).length).toBeGreaterThan(0);
  });
});

/* =====================================================
   W109
===================================================== */

describe("W109 patient feedback", () => {
  const openForm = async (user) => {
    await user.click(screen.getAllByRole("button", { name: /submit feedback/i })[0]);
    return screen.findByRole("dialog");
  };

  it("lists the patient's feedback, including admin responses", async () => {
    renderApp("/patient/feedback", { role: "patient" });
    await findPageHeading(/feedback/i);

    expect(screen.getByRole("article", { name: /long waiting time/i })).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: /appointment reminders/i })).getByText(
        /reviewing improvements/i
      )
    ).toBeInTheDocument();
  });

  it("validates the feedback form", async () => {
    const { user } = renderApp("/patient/feedback", { role: "patient" });
    await findPageHeading(/feedback/i);

    const dialog = await openForm(user);
    await user.click(within(dialog).getByRole("button", { name: /submit/i }));

    expect(fieldError(within(dialog).getByLabelText(/subject/i))).toBeTruthy();
    expect(fieldError(within(dialog).getByLabelText(/message/i))).toBeTruthy();
  });

  it("submits feedback that administrators receive", async () => {
    const { user } = renderApp("/patient/feedback", { role: "patient" });
    await findPageHeading(/feedback/i);

    const dialog = await openForm(user);
    await user.type(within(dialog).getByLabelText(/subject/i), "Friendly nurses");
    await user.type(
      within(dialog).getByLabelText(/message/i),
      "The nursing team made my visit very comfortable."
    );
    await user.click(within(dialog).getByRole("radio", { name: /4 out of 5 stars/i }));
    await user.click(within(dialog).getByRole("button", { name: /submit/i }));

    expect(await screen.findByRole("article", { name: /friendly nurses/i })).toBeInTheDocument();
    expect(loadFeedback()[0]).toMatchObject({
      patientId: 1,
      patient: "John Smith",
      subject: "Friendly nurses",
      rating: 4,
      status: "Open",
    });
  });

  it("edits and deletes feedback that has not been reviewed", async () => {
    const { user } = renderApp("/patient/feedback", { role: "patient" });
    await findPageHeading(/feedback/i);

    const card = screen.getByRole("article", { name: /long waiting time/i });
    await user.click(within(card).getByRole("button", { name: /edit/i }));
    const dialog = await screen.findByRole("dialog");
    const subject = within(dialog).getByLabelText(/subject/i);
    await user.clear(subject);
    await user.type(subject, "Very long waiting time");
    await user.click(within(dialog).getByRole("button", { name: /update|save/i }));

    const updated = await screen.findByRole("article", { name: /very long waiting time/i });
    expect(loadFeedback().find((item) => item.id === "FB-2001").subject).toBe(
      "Very long waiting time"
    );

    await user.click(within(updated).getByRole("button", { name: /delete/i }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /yes, delete/i })
    );

    await waitFor(() =>
      expect(screen.queryByRole("article", { name: /very long waiting time/i })).not.toBeInTheDocument()
    );
    expect(loadFeedback().some((item) => item.id === "FB-2001")).toBe(false);
  });

  it("reviewed feedback cannot be edited", async () => {
    renderApp("/patient/feedback", { role: "patient" });
    await findPageHeading(/feedback/i);

    const reviewed = screen.getByRole("article", { name: /appointment reminders/i });
    expect(within(reviewed).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("shows an empty state when the patient has no feedback", async () => {
    saveFeedback(loadFeedback().filter((item) => item.patientId !== 1));
    renderApp("/patient/feedback", { role: "patient" });
    await findPageHeading(/feedback/i);

    expect(screen.getByText(/no feedback/i)).toBeInTheDocument();
  });
});
