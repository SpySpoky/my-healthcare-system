// Clinical records per patient: history, diagnoses, prescriptions,
// doctor notes and vital signs. Written by the doctor portal and
// read by both the doctor's patient record and the patient's own
// medical records page.

import { STORAGE_KEYS, loadStored, saveStored } from "./storage";
import { getPatientAppointments } from "./appointmentData";
import { fromDemo } from "./demoRegistry";
import { formatDate, getRelativeDate } from "../utils/date";
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

/* =====================================================
   MONITORING (derived from vitals)
===================================================== */

const buildMonitoring = (vitals, lastDoctor) => {
  if (!vitals) {
    return { readings: [], history: [] };
  }

  const systolic = Number(vitals.bloodPressure.split("/")[0]);

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

  const history = [
    { date: formatDate(vitals.recordedAt), time: "09:30", heartRate: `${vitals.heartRate} bpm`, bloodPressure: `${vitals.bloodPressure} mmHg`, temperature: `${vitals.temperature} °C`, oxygen: `${vitals.oxygen}%`, recordedBy: lastDoctor },
    { date: formatDate(getRelativeDate(-8)), time: "10:15", heartRate: `${Number(vitals.heartRate) + 3} bpm`, bloodPressure: `${vitals.bloodPressure} mmHg`, temperature: `${vitals.temperature} °C`, oxygen: `${vitals.oxygen}%`, recordedBy: lastDoctor },
  ];

  return { readings, history };
};

// Full record for the doctor's patient record page.
export const getPatientRecord = (patientId) => {
  if (!getPatientById(patientId)) {
    return null;
  }

  const record = loadClinicalRecord(Number(patientId));
  const lastDoctor = record.medicalHistory[0]?.doctor || "Clinic staff";
  const { readings, history } = buildMonitoring(record.vitals, lastDoctor);

  return {
    ...record,
    appointments: getPatientAppointments(patientId).reverse(),
    monitoringReadings: readings,
    monitoringHistory: history,
  };
};
