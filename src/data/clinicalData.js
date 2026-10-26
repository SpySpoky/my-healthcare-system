// Clinical records per patient: history, diagnoses, prescriptions,
// doctor notes and vital signs. Written by the doctor portal and
// read by both the doctor's patient record and the patient's own
// medical records page.

import { STORAGE_KEYS, loadStored, saveStored } from "./storage";
import { getPatientAppointments } from "./appointmentData";
import { fromDemo } from "./demoRegistry";
import { formatDate } from "../utils/date";
import { getPatientById } from "./patientsData";

import { t } from "../i18n";
const loadAllRecords = () =>
  loadStored(STORAGE_KEYS.clinicalRecords, () => fromDemo("clinicalRecords", () => ({})));

const emptyRecord = () => ({
  medicalHistory: [],
  diagnoses: [],
  prescriptions: [],
  notes: [],
  vitals: null,
  vitalsHistory: [],
});

export const loadClinicalRecord = (patientId) =>
  loadAllRecords()[patientId] || emptyRecord();

const saveClinicalRecord = (patientId, record) =>
  saveStored(STORAGE_KEYS.clinicalRecords, {
    ...loadAllRecords(),
    [patientId]: record,
  });

// Adds an entry to one section ("diagnoses", "prescriptions",
// "notes", "medicalHistory") and returns the updated record.
export const addClinicalEntry = (patientId, section, entry) => {
  const record = loadClinicalRecord(patientId);
  const allIds = [
    ...record.medicalHistory,
    ...record.diagnoses,
    ...record.prescriptions,
    ...record.notes,
  ].map((item) => item.id);

  const updated = {
    ...record,
    [section]: [
      { id: Math.max(0, ...allIds) + 1, ...entry },
      ...record[section],
    ],
  };

  saveClinicalRecord(patientId, updated);

  return updated;
};

// Records a new set of vital signs. The newest reading becomes the
// patient's current status and is kept in the monitoring history.
export const recordVitals = (patientId, reading) => {
  const record = loadClinicalRecord(patientId);
  const history = record.vitalsHistory || (record.vitals ? [record.vitals] : []);
  const entry = {
    id: Math.max(0, ...history.map((item) => Number(item.id) || 0)) + 1,
    ...reading,
  };

  const updated = { ...record, vitals: entry, vitalsHistory: [entry, ...history] };

  saveClinicalRecord(patientId, updated);

  return updated;
};

/* =====================================================
   MONITORING (derived from vitals)
===================================================== */

const buildMonitoring = (vitals, history, lastDoctor) => {
  if (!vitals) {
    return { readings: [], history: [] };
  }

  const systolic = Number(String(vitals.bloodPressure || "").split("/")[0]);

  const readings = [
    { id: 1, label: t("Heart Rate"), value: vitals.heartRate, unit: "bpm", icon: "❤️", iconClass: "bg-rose-100 text-rose-600", isNormal: Number(vitals.heartRate) >= 60 && Number(vitals.heartRate) <= 100 },
    { id: 2, label: t("Blood Pressure"), value: vitals.bloodPressure, unit: "mmHg", icon: "🩸", iconClass: "bg-red-100 text-red-600", isNormal: systolic < 130 },
    { id: 3, label: t("Temperature"), value: vitals.temperature, unit: "°C", icon: "🌡️", iconClass: "bg-amber-100 text-amber-600", isNormal: Number(vitals.temperature) < 37.3 },
    { id: 4, label: t("Oxygen Saturation"), value: vitals.oxygen, unit: "%", icon: "🫁", iconClass: "bg-cyan-100 text-cyan-600", isNormal: Number(vitals.oxygen) >= 95 },
    { id: 5, label: t("Weight"), value: vitals.weight, unit: "kg", icon: "⚖️", iconClass: "bg-blue-100 text-blue-600", isNormal: true, normalLabel: t("Stable") },
  ].map(({ isNormal, normalLabel, ...reading }) => ({
    ...reading,
    status: isNormal ? normalLabel || "Normal" : "Monitor",
    statusClass: isNormal
      ? normalLabel
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700",
  }));

  // Every reading ever taken for this patient, newest first.
  const blank = (value, unit) => (value === "" || value === undefined ? "—" : `${value}${unit}`);
  const readingHistory = (history?.length ? history : [vitals]).map((entry) => ({
    date: formatDate(entry.recordedAt),
    time: entry.recordedTime || "—",
    heartRate: blank(entry.heartRate, " bpm"),
    bloodPressure: blank(entry.bloodPressure, " mmHg"),
    temperature: blank(entry.temperature, " °C"),
    oxygen: blank(entry.oxygen, "%"),
    recordedBy: entry.recordedBy || lastDoctor,
  }));

  return { readings, history: readingHistory };
};

// Full record for the doctor's patient record page.
export const getPatientRecord = (patientId) => {
  if (!getPatientById(patientId)) {
    return null;
  }

  const record = loadClinicalRecord(Number(patientId));
  const lastDoctor = record.medicalHistory[0]?.doctor || "Clinic staff";
  const { readings, history } = buildMonitoring(record.vitals, record.vitalsHistory, lastDoctor);

  return {
    ...record,
    appointments: getPatientAppointments(patientId).reverse(),
    monitoringReadings: readings,
    monitoringHistory: history,
  };
};
