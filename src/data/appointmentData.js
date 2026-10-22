// All appointments in the system, shared by the patient, doctor and
// admin portals. Dates are stored as YYYY-MM-DD.

import { STORAGE_KEYS, loadStored, saveStored } from "./storage";
import { fromDemo } from "./demoRegistry";
import {
  formatDate,
  formatLongDate,
  getTodayDate,
  parseDate,
  timeToMinutes,
} from "../utils/date";

// The doctors listed when booking (loaded from the database).
export { MOCK_DOCTORS } from "./doctorsData";

// Bookable appointment times (30-minute slots).
export const TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
];

export const ACTIVE_STATUSES = ["Pending", "Confirmed"];

export const loadAppointments = () =>
  loadStored(STORAGE_KEYS.appointments, () => fromDemo("appointments", () => []));

export const saveAppointments = (appointments) =>
  saveStored(STORAGE_KEYS.appointments, appointments);

export const updateAppointment = (id, changes) => {
  const appointments = loadAppointments().map((appointment) =>
    appointment.id === id ? { ...appointment, ...changes } : appointment
  );

  saveAppointments(appointments);

  return appointments;
};

export const getNextAppointmentId = (appointments) =>
  Math.max(0, ...appointments.map((appointment) => Number(appointment.id) || 0)) + 1;

// Earliest first by date, then time.
export const byDateTime = (a, b) =>
  (parseDate(a.date) || 0) - (parseDate(b.date) || 0) ||
  timeToMinutes(a.time) - timeToMinutes(b.time);

export const getPatientAppointments = (patientId) =>
  loadAppointments()
    .filter((appointment) => String(appointment.patientId) === String(patientId))
    .sort(byDateTime);

// Doctors see their own appointments; medical staff (no doctorId)
// see every appointment.
export const getDoctorAppointments = (doctorId) =>
  loadAppointments()
    .filter((appointment) => !doctorId || appointment.doctorId === doctorId)
    .sort(byDateTime);

export const isUpcoming = (appointment) =>
  ACTIVE_STATUSES.includes(appointment.status) &&
  appointment.date >= getTodayDate();

// Times already taken for a doctor on a date (ignoring one
// appointment, e.g. the one being rescheduled).
export const getBookedTimes = (doctorId, dateKey, ignoreId) =>
  loadAppointments()
    .filter(
      (appointment) =>
        appointment.doctorId === doctorId &&
        appointment.date === dateKey &&
        appointment.id !== ignoreId &&
        appointment.status !== "Cancelled"
    )
    .map((appointment) => appointment.time);

export const formatAppointmentDate = formatDate;
export const formatAppointmentDateLong = formatLongDate;
export const parseAppointmentDate = parseDate;
