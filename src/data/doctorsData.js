// Doctors, departments and weekly availability. They come from the
// database (loaded by src/api/hydrate.js); nothing is hardcoded here.

import { STORAGE_KEYS, loadStored, saveStored } from "./storage";
import { fromDemo } from "./demoRegistry";
import { getWeekday, timeToMinutes } from "../utils/date";

// Many pages import these lists directly, so they are filled in place
// (see setDoctors / setDepartments) instead of being reassigned.

// Active doctors: { id, name, department, email, specialty, phone }
export const DOCTORS = [];

// Departments that have at least one doctor (what patients can book).
export const DEPARTMENTS = [];

// Every department in the clinic, including ones without doctors.
export const ALL_DEPARTMENTS = [];

// The doctors as listed on the booking page.
export const MOCK_DOCTORS = [];

const replaceContents = (target, items) => target.splice(0, target.length, ...items);

export const setDoctors = (doctors) => {
  replaceContents(DOCTORS, doctors);
  replaceContents(
    MOCK_DOCTORS,
    doctors.map((doctor) => ({ ...doctor, availability: "Available" }))
  );
  replaceContents(DEPARTMENTS, [...new Set(doctors.map((doctor) => doctor.department))].sort());
};

export const setDepartments = (names) => replaceContents(ALL_DEPARTMENTS, [...names].sort());

export const getDoctorById = (id) =>
  DOCTORS.find((doctor) => doctor.id === id) || null;

export const getDoctorByEmail = (email) =>
  DOCTORS.find(
    (doctor) => doctor.email.toLowerCase() === String(email).toLowerCase()
  ) || null;

export const getDoctorByName = (name) =>
  DOCTORS.find((doctor) => doctor.name === name) || null;

/* =====================================================
   AVAILABILITY
   Weekly slots per doctor: { id, day, startTime, endTime, status }
   with 24-hour "HH:MM" times.
===================================================== */

export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const loadAllAvailability = () =>
  loadStored(STORAGE_KEYS.availability, () => fromDemo("availability", () => ({})));

export const loadAvailability = (doctorId) =>
  loadAllAvailability()[doctorId] || [];

export const saveAvailability = (doctorId, slots) =>
  saveStored(STORAGE_KEYS.availability, {
    ...loadAllAvailability(),
    [doctorId]: slots,
  });

// Bookable times for a doctor on a date: TIME_SLOTS that fall inside
// one of the doctor's available slots for that weekday.
export const getDoctorTimesForDate = (doctorId, dateKey, timeSlots) => {
  const weekday = getWeekday(dateKey);
  const slots = loadAvailability(doctorId).filter(
    (slot) => slot.day === weekday && slot.status === "Available"
  );

  return timeSlots.filter((time) => {
    const minutes = timeToMinutes(time);

    return slots.some(
      (slot) =>
        minutes >= timeToMinutes(slot.startTime) &&
        minutes + 30 <= timeToMinutes(slot.endTime)
    );
  });
};
