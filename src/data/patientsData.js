// Patient profiles shared by every portal.

import { STORAGE_KEYS, loadStored, saveStored } from "./storage";
import { fromDemo } from "./demoRegistry";
import { parseDate } from "../utils/date";

export const getAge = (dateOfBirth) => {
  const birthDate = parseDate(dateOfBirth);

  if (!birthDate) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
};

export const loadPatients = () =>
  loadStored(STORAGE_KEYS.patients, () => fromDemo("patients", () => []));

export const savePatients = (patients) =>
  saveStored(STORAGE_KEYS.patients, patients);

export const getPatientById = (id) =>
  loadPatients().find((patient) => String(patient.id) === String(id)) ||
  null;

export const getPatientByEmail = (email) =>
  loadPatients().find(
    (patient) => patient.email.toLowerCase() === String(email).toLowerCase()
  ) || null;

export const updatePatient = (id, changes) => {
  const patients = loadPatients().map((patient) =>
    patient.id === id ? { ...patient, ...changes } : patient
  );

  savePatients(patients);

  return patients.find((patient) => patient.id === id);
};

// Adds a patient (from registration) and returns it.
export const addPatient = (details) => {
  const patients = loadPatients();
  const patient = {
    id: Math.max(0, ...patients.map((item) => item.id)) + 1,
    bloodType: "Unknown",
    allergies: "None recorded",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    status: "Active",
    ...details,
  };

  savePatients([...patients, patient]);

  return patient;
};
