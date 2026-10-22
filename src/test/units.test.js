// Unit tests for validation rules and data helpers used across the UI.

import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRegistration,
} from "../utils/validation/authValidation";
import { validateFeedbackForm } from "../utils/validation/feedbackValidation";
import {
  formatDate,
  getRelativeDate,
  getTodayDate,
  getWeekday,
  parseDate,
  timeToMinutes,
} from "../utils/date";
import {
  TIME_SLOTS,
  getBookedTimes,
  getPatientAppointments,
  isUpcoming,
} from "../data/appointmentData";
import { getDoctorTimesForDate, loadAvailability } from "../data/doctorsData";
import { getAge } from "../data/patientsData";
import { getLoginRoleBySlug } from "../data/authData";

describe("auth validation", () => {
  it("validates emails", () => {
    expect(validateEmail("")).toMatch(/required/i);
    expect(validateEmail("a@b")).toMatch(/valid/i);
    expect(validateEmail("person@example.com")).toBe("");
  });

  it("requires 8+ characters with a letter and a number", () => {
    expect(validateNewPassword("")).toMatch(/required/i);
    expect(validateNewPassword("abc1")).toMatch(/at least 8/i);
    expect(validateNewPassword("abcdefgh")).toMatch(/letter and one number/i);
    expect(validateNewPassword("abcdefg1")).toBe("");
    expect(validatePasswordConfirmation("abcdefg1", "abcdefg2")).toMatch(/do not match/i);
  });

  it("validates a full registration", () => {
    const valid = {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+90 555 111 2222",
      dateOfBirth: "1990-01-01",
      gender: "female",
      password: "secure123",
      confirmPassword: "secure123",
      acceptTerms: true,
    };

    expect(validateRegistration(valid)).toEqual({});
    expect(validateRegistration({ ...valid, fullName: "J4ne!" }).fullName).toBeTruthy();
    expect(validateRegistration({ ...valid, phone: "123" }).phone).toBeTruthy();
    expect(validateRegistration({ ...valid, dateOfBirth: getRelativeDate(5) }).dateOfBirth).toMatch(/future/i);
    expect(validateRegistration({ ...valid, acceptTerms: false }).acceptTerms).toBeTruthy();
  });
});

describe("feedback validation", () => {
  const valid = {
    type: "Feedback",
    subject: "Helpful staff",
    message: "The reception staff were very helpful today.",
    rating: "5",
  };

  it("accepts valid feedback and rejects missing or unsafe content", () => {
    expect(validateFeedbackForm(valid)).toEqual({});
    expect(validateFeedbackForm({ ...valid, subject: "" }).subject).toBeTruthy();
    expect(validateFeedbackForm({ ...valid, message: "short" }).message).toBeTruthy();
    expect(validateFeedbackForm({ ...valid, message: "<script>alert(1)</script> text here" }).message).toBeTruthy();
  });
});

describe("date helpers", () => {
  it("formats and parses dates", () => {
    expect(formatDate("2026-03-15")).toBe("15 March 2026");
    expect(parseDate("not a date")).toBeNull();
    expect(getWeekday("2026-10-05")).toBe("Monday");
    expect(getRelativeDate(0)).toBe(getTodayDate());
  });

  it("converts 12- and 24-hour times to minutes", () => {
    expect(timeToMinutes("09:30 AM")).toBe(570);
    expect(timeToMinutes("12:00 PM")).toBe(720);
    expect(timeToMinutes("02:00 PM")).toBe(840);
    expect(timeToMinutes("14:00")).toBe(840);
  });

  it("computes ages", () => {
    expect(getAge(`${new Date().getFullYear() - 30}-01-01`)).toBe(30);
  });
});

describe("appointment and availability helpers", () => {
  it("returns only the patient's own appointments, in date order", () => {
    const mine = getPatientAppointments(1);

    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((item) => item.patientId === 1)).toBe(true);
    expect(mine.map((item) => item.date)).toEqual([...mine.map((item) => item.date)].sort());
  });

  it("treats only future Pending/Confirmed appointments as upcoming", () => {
    expect(isUpcoming({ status: "Pending", date: getRelativeDate(1) })).toBe(true);
    expect(isUpcoming({ status: "Confirmed", date: getRelativeDate(-1) })).toBe(false);
    expect(isUpcoming({ status: "Cancelled", date: getRelativeDate(1) })).toBe(false);
  });

  it("offers times only inside the doctor's working hours", () => {
    const slots = loadAvailability("sarah-johnson");
    const monday = slots.filter((slot) => slot.day === "Monday");
    let date = null;

    for (let offset = 1; offset <= 7 && !date; offset += 1) {
      const candidate = getRelativeDate(offset);
      if (getWeekday(candidate) === "Monday") date = candidate;
    }

    const times = getDoctorTimesForDate("sarah-johnson", date, TIME_SLOTS);
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) {
      const minutes = timeToMinutes(time);
      expect(
        monday.some((slot) => minutes >= timeToMinutes(slot.startTime) && minutes + 30 <= timeToMinutes(slot.endTime))
      ).toBe(true);
    }
  });

  it("lists booked times, ignoring cancelled and the appointment being moved", () => {
    const booked = getBookedTimes("sarah-johnson", getRelativeDate(0));
    expect(booked).toContain("09:00 AM");
    expect(getBookedTimes("sarah-johnson", getRelativeDate(0), 1)).not.toContain("09:00 AM");
    expect(getBookedTimes("sarah-johnson", getRelativeDate(-2))).toEqual([]);
  });

  it("maps login URLs to roles", () => {
    expect(getLoginRoleBySlug("medical-staff").value).toBe("medical_staff");
    expect(getLoginRoleBySlug("nurse")).toBeUndefined();
  });
});
