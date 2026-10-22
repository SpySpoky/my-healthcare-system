// The patient's own view of their clinical record (Medical Records
// page and dashboard). Built from the same data the doctor edits.

import { getPatientAppointments } from "./appointmentData";
import { loadClinicalRecord } from "./clinicalData";
import { byDateDesc, formatDate } from "../utils/date";

import { lower, t } from "../i18n";
export const getPatientRecordsView = (patientId) => {
  const record = loadClinicalRecord(Number(patientId));

  const diagnosisOn = (date) =>
    record.diagnoses.find((item) => item.date === date)?.diagnosis;

  const prescriptionOn = (date) =>
    record.prescriptions.find((item) => item.date === date)?.medication;

  const medicalHistory = [...record.medicalHistory]
    .sort(byDateDesc)
    .map((item) => ({
      id: item.id,
      date: formatDate(item.date),
      doctor: item.doctor,
      department: item.department,
      recordType: item.title,
      diagnosis: diagnosisOn(item.date) || item.title,
      notes: item.description,
      prescription: prescriptionOn(item.date) || "None",
    }));

  const diagnoses = [...record.diagnoses].sort(byDateDesc).map((item) => ({
    id: item.id,
    diagnosis: item.diagnosis,
    doctor: item.doctor,
    department: item.department,
    date: formatDate(item.date),
    status: item.status || "Active",
  }));

  const prescriptions = [...record.prescriptions]
    .sort(byDateDesc)
    .map((item) => ({
      id: item.id,
      medicine: item.medication,
      dosage: item.dosage,
      frequency: t(item.frequency),
      duration: item.duration,
      status: item.status || "Active",
      doctor: item.doctor,
      date: formatDate(item.date),
    }));

  const appointmentHistory = getPatientAppointments(patientId)
    .reverse()
    .map((item) => ({
      id: item.id,
      date: formatDate(item.date),
      time: item.time,
      doctor: item.doctor,
      department: item.department,
      appointmentType: item.reason,
      status: item.status,
    }));

  const medicalNotes = [...record.notes].sort(byDateDesc).map((item) => ({
    id: item.id,
    date: formatDate(item.date),
    doctor: item.doctor,
    department: item.department,
    diagnosis: diagnosisOn(item.date) || "General note",
    note: item.note,
  }));

  return {
    medicalHistory,
    diagnoses,
    prescriptions,
    appointmentHistory,
    medicalNotes,
  };
};

// Latest diagnoses, prescriptions and notes for the patient dashboard.
export const getRecentMedicalUpdates = (patientId, limit = 3) => {
  const record = loadClinicalRecord(Number(patientId));

  return [
    ...record.diagnoses.map((item) => ({
      key: `diagnosis-${item.id}`,
      type: "Diagnosis",
      icon: "🩺",
      title: t("Diagnosis: {diagnosis}", { diagnosis: item.diagnosis }),
      description: item.notes,
      doctor: item.doctor,
      date: item.date,
    })),
    ...record.prescriptions.map((item) => ({
      key: `prescription-${item.id}`,
      type: "Prescription",
      icon: "💊",
      title: t("Prescription: {medication}", { medication: item.medication }),
      description: t("{dosage}, {frequency} for {duration}.", {
        dosage: item.dosage,
        frequency: lower(t(item.frequency)),
        duration: item.duration,
      }),
      doctor: item.doctor,
      date: item.date,
    })),
    ...record.notes.map((item) => ({
      key: `note-${item.id}`,
      type: "Medical Note",
      icon: "📝",
      title: t("Doctor's note added"),
      description: item.note,
      doctor: item.doctor,
      date: item.date,
    })),
  ]
    .sort(byDateDesc)
    .slice(0, limit)
    .map((item) => ({ ...item, date: formatDate(item.date) }));
};

export const getActivePrescriptions = (patientId) =>
  loadClinicalRecord(Number(patientId)).prescriptions.filter(
    (item) => (item.status || "Active") === "Active"
  );
