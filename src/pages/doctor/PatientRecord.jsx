import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/layout/PageHeader";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { logActivity } from "../../data/adminData";
import Modal from "../../components/common/Modal";
import Button from "../../components/forms/Button";
import Input from "../../components/forms/Input";
import {
  addClinicalEntry,
  getPatientRecord,
  recordVitals,
} from "../../data/clinicalData";
import { getDoctorByEmail } from "../../data/doctorsData";
import { getPatientById } from "../../data/patientsData";
import { formatDate, getTodayDate } from "../../utils/date";


import { t } from "../../i18n";
const VIEW_PATHS = {
  diagnosis: "diagnosis",
  prescription: "prescription",
  status: "status",
};

function PatientRecord({ patient, view }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const basePath = `/doctor/patients/${patient.id}`;

  // Entries are signed by the signed-in clinician.
  const author = {
    doctor: user?.name || "Clinic staff",
    department: getDoctorByEmail(user?.email)?.department || "Care team",
  };

  const [initialRecord] = useState(() =>
    getPatientRecord(patient.id)
  );

  const [selectedTab, setSelectedTab] = useState("history");

  // The Status route always shows the monitoring tab;
  // the Diagnosis / Prescription routes open their modals.
  const activeTab =
    view === VIEW_PATHS.status ? "monitoring" : selectedTab;
  const showDiagnosisModal = view === VIEW_PATHS.diagnosis;
  const showPrescriptionModal =
    view === VIEW_PATHS.prescription;

  const setActiveTab = (tabId) => {
    if (tabId === "monitoring") {
      navigate(`${basePath}/${VIEW_PATHS.status}`);
      return;
    }

    setSelectedTab(tabId);

    if (view === VIEW_PATHS.status) {
      navigate(basePath);
    }
  };

  const {
    medicalHistory,
    appointments,
    notes,
  } = initialRecord;

  // Vital signs change while the page is open (doctors and nurses
  // record them here), so they are kept in state.
  const [monitoring, setMonitoring] = useState({
    readings: initialRecord.monitoringReadings,
    history: initialRecord.monitoringHistory,
  });

  const { readings: monitoringReadings, history: monitoringHistory } = monitoring;

  // Newest recording first; a patient may have none yet.
  const latestMeasurement = monitoringHistory[0] ?? null;

  const [diagnoses, setDiagnoses] = useState(
    initialRecord.diagnoses
  );

  const [prescriptions, setPrescriptions] = useState(
    initialRecord.prescriptions
  );

  const needsMonitoring = monitoringReadings.some(
    (reading) => reading.status === "Monitor"
  );

  /* =====================================================
     FORMS
  ===================================================== */

  /* ---------- vital signs ---------- */

  // Doctors and medical staff (nurses) record readings here; this is
  // how a patient's status is monitored.
  const BLANK_VITALS = {
    heartRate: "",
    bloodPressure: "",
    temperature: "",
    oxygen: "",
    weight: "",
    date: "",
  };

  const [isRecordingVitals, setIsRecordingVitals] = useState(false);
  const [vitalsForm, setVitalsForm] = useState(BLANK_VITALS);
  const [vitalsErrors, setVitalsErrors] = useState({});

  const openVitalsModal = () => {
    setVitalsForm({ ...BLANK_VITALS, date: getTodayDate() });
    setVitalsErrors({});
    setIsRecordingVitals(true);
  };

  const handleVitalsChange = (event) => {
    const { name, value } = event.target;

    setVitalsForm((previous) => ({ ...previous, [name]: value }));

    if (vitalsErrors[name]) {
      setVitalsErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  // Ranges match the CHECK constraints on vital_signs.
  const VITAL_RANGES = {
    heartRate: [20, 250, t("Heart rate must be between 20 and 250 bpm.")],
    temperature: [30, 45, t("Temperature must be between 30 and 45 °C.")],
    oxygen: [50, 100, t("Oxygen saturation must be between 50 and 100%.")],
    weight: [1, 500, t("Weight must be between 1 and 500 kg.")],
  };

  const validateVitals = () => {
    const errors = {};

    Object.entries(VITAL_RANGES).forEach(([field, [min, max, message]]) => {
      const value = vitalsForm[field].trim();

      if (value && (Number.isNaN(Number(value)) || Number(value) < min || Number(value) > max)) {
        errors[field] = message;
      }
    });

    if (vitalsForm.bloodPressure.trim() && !/^\d{2,3}\/\d{2,3}$/.test(vitalsForm.bloodPressure.trim())) {
      errors.bloodPressure = t("Blood pressure must look like 120/80.");
    }

    if (!vitalsForm.date) {
      errors.date = t("Select a date.");
    } else if (vitalsForm.date > getTodayDate()) {
      errors.date = t("The date cannot be in the future.");
    }

    const hasReading = ["heartRate", "bloodPressure", "temperature", "oxygen", "weight"].some(
      (field) => vitalsForm[field].trim()
    );

    if (!hasReading) {
      errors.heartRate = t("Enter at least one reading.");
    }

    setVitalsErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleVitalsSubmit = (event) => {
    event.preventDefault();

    if (!validateVitals()) {
      return;
    }

    recordVitals(patient.id, {
      heartRate: vitalsForm.heartRate.trim(),
      bloodPressure: vitalsForm.bloodPressure.trim(),
      temperature: vitalsForm.temperature.trim(),
      oxygen: vitalsForm.oxygen.trim(),
      weight: vitalsForm.weight.trim(),
      recordedAt: vitalsForm.date,
      recordedBy: author.doctor,
    });

    const updated = getPatientRecord(patient.id);

    setMonitoring({
      readings: updated.monitoringReadings,
      history: updated.monitoringHistory,
    });

    logActivity(user, `Recorded vital signs for ${patient.name}`, "Medical Records");
    showToast(t("Vital signs were recorded."));
    setIsRecordingVitals(false);
  };

  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis: "",
    date: "",
    notes: "",
  });

  const [diagnosisErrors, setDiagnosisErrors] =
    useState({});

  const [prescriptionForm, setPrescriptionForm] =
    useState({
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      date: "",
    });

  const [prescriptionErrors, setPrescriptionErrors] =
    useState({});

  const tabs = [
    {
      id: "history",
      label: t("Medical History"),
      icon: "📋",
      count: medicalHistory.length,
    },
    {
      id: "diagnoses",
      label: t("Diagnoses"),
      icon: "🩺",
      count: diagnoses.length,
    },
    {
      id: "prescriptions",
      label: t("Prescriptions"),
      icon: "💊",
      count: prescriptions.length,
    },
    {
      id: "appointments",
      label: t("Appointments"),
      icon: "📅",
      count: appointments.length,
    },
    {
      id: "notes",
      label: t("Doctor Notes"),
      icon: "📝",
      count: notes.length,
    },
    {
      id: "monitoring",
      label: t("Monitoring"),
      icon: "📈",
      count: monitoringReadings.length,
    },
  ];

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("");
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "Pending":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "Confirmed":
        return "border-indigo-200 bg-indigo-50 text-indigo-700";
      case "Cancelled":
        return "border-rose-200 bg-rose-50 text-rose-700";
      default:
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
  };

  /* =====================================================
     DIAGNOSIS WORKFLOW
  ===================================================== */

  const openDiagnosisModal = () => {
    setDiagnosisForm({
      diagnosis: "",
      date: "",
      notes: "",
    });

    setDiagnosisErrors({});
    navigate(`${basePath}/${VIEW_PATHS.diagnosis}`);
  };

  const closeDiagnosisModal = () => {
    navigate(basePath);
    setDiagnosisErrors({});
  };

  useEscapeKey(showDiagnosisModal, () => navigate(basePath));
  useEscapeKey(showPrescriptionModal, () => navigate(basePath));

  const handleDiagnosisChange = (event) => {
    const { name, value } = event.target;

    setDiagnosisForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (diagnosisErrors[name]) {
      setDiagnosisErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  const validateDiagnosis = () => {
    const errors = {};

    if (!diagnosisForm.diagnosis.trim()) {
      errors.diagnosis =
        t("Diagnosis is required.");
    }

    if (!diagnosisForm.date) {
      errors.date =
        t("Diagnosis date is required.");
    } else if (diagnosisForm.date > getTodayDate()) {
      errors.date =
        t("Diagnosis date cannot be in the future.");
    }

    if (!diagnosisForm.notes.trim()) {
      errors.notes =
        t("Clinical notes are required.");
    }

    setDiagnosisErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleDiagnosisSubmit = (event) => {
    event.preventDefault();

    if (!validateDiagnosis()) {
      return;
    }

    const updated = addClinicalEntry(patient.id, "diagnoses", {
      date: diagnosisForm.date,
      diagnosis: diagnosisForm.diagnosis.trim(),
      notes: diagnosisForm.notes.trim(),
      status: "Active",
      ...author,
    });

    setDiagnoses(updated.diagnoses);
    logActivity(
      user,
      `Added diagnosis for patient #${patient.id}`,
      "Medical Records"
    );

    setSelectedTab("diagnoses");
    closeDiagnosisModal();
    showToast(t("Diagnosis added to the patient record."));
  };

  /* =====================================================
     PRESCRIPTION WORKFLOW
  ===================================================== */

  const openPrescriptionModal = () => {
    setPrescriptionForm({
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      date: "",
    });

    setPrescriptionErrors({});
    navigate(`${basePath}/${VIEW_PATHS.prescription}`);
  };

  const closePrescriptionModal = () => {
    navigate(basePath);
    setPrescriptionErrors({});
  };

  const handlePrescriptionChange = (event) => {
    const { name, value } = event.target;

    setPrescriptionForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (prescriptionErrors[name]) {
      setPrescriptionErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  const validatePrescription = () => {
    const errors = {};

    if (!prescriptionForm.medication.trim()) {
      errors.medication =
        t("Medication name is required.");
    }

    if (!prescriptionForm.dosage.trim()) {
      errors.dosage =
        t("Dosage is required.");
    }

    if (!prescriptionForm.frequency.trim()) {
      errors.frequency =
        t("Frequency is required.");
    }

    if (!prescriptionForm.duration.trim()) {
      errors.duration =
        t("Duration is required.");
    }

    if (!prescriptionForm.instructions.trim()) {
      errors.instructions =
        t("Instructions are required.");
    }

    if (!prescriptionForm.date) {
      errors.date =
        t("Prescription date is required.");
    } else if (prescriptionForm.date > getTodayDate()) {
      errors.date =
        t("Prescription date cannot be in the future.");
    }

    setPrescriptionErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handlePrescriptionSubmit = (event) => {
    event.preventDefault();

    if (!validatePrescription()) {
      return;
    }

    const updated = addClinicalEntry(patient.id, "prescriptions", {
      date: prescriptionForm.date,
      medication: prescriptionForm.medication.trim(),
      dosage: prescriptionForm.dosage.trim(),
      frequency: prescriptionForm.frequency.trim(),
      duration: prescriptionForm.duration.trim(),
      instructions: prescriptionForm.instructions.trim(),
      status: "Active",
      ...author,
    });

    setPrescriptions(updated.prescriptions);
    logActivity(
      user,
      `Prescribed medication for patient #${patient.id}`,
      "Medical Records"
    );

    setSelectedTab("prescriptions");
    closePrescriptionModal();
    showToast(t("Prescription added to the patient record."));
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 p-6 text-white shadow-2xl shadow-indigo-500/20 sm:p-8">

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute -bottom-32 right-20 h-80 w-80 rounded-full border border-white/10 bg-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <Link
              to="/doctor/patients"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-indigo-50 backdrop-blur-md transition-all hover:bg-white/20"
            >{t("← Back to Patients")}</Link>

            <div className="mt-5">

              <div className="mb-3 text-xs font-black tracking-[0.2em] text-indigo-100">{t("DOCTOR WORKSPACE")}</div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("Patient Medical Record")}</h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">{t("View the patient's medical history, diagnoses, prescriptions, appointments, notes, and current health status.")}</p>

            </div>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">

            <button
              type="button"
              onClick={() =>
                showToast(
                  t("Editing the full medical record will be available after backend integration."),
                  "info"
                )
              }
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-xl"
            >{t("Edit Record")}</button>

            <button
              type="button"
              onClick={openDiagnosisModal}
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-50 hover:shadow-2xl"
            >{t("+ Add Diagnosis")}</button>

            <button
              type="button"
              onClick={openPrescriptionModal}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-xl"
            >{t("+ Prescribe Medication")}</button>

          </div>

        </div>

      </section>


      {/* =====================================================
          PATIENT SUMMARY
      ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-7">

        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-50/70 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">

          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 text-2xl font-black text-white shadow-xl shadow-indigo-500/20">
            {getInitials(patient.name)}
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-3">

              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {patient.name}
              </h2>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                {t(patient.status)}

              </span>

            </div>

            <p className="mt-1 text-sm font-semibold text-slate-400">{t("Patient ID: {id}", { id: patient.id })}</p>

            <div className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-6">

              <span>📧 {patient.email}</span>

              <span>📞 {patient.phone}</span>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          BASIC INFORMATION
      ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

          <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("PATIENT DETAILS")}</div>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Patient Information")}</h2>

        </div>

        <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">

          {[
            {
              label: t("Date of Birth"),
              value: formatDate(patient.dateOfBirth),
              icon: "🎂",
            },
            {
              label: t("Gender"),
              value: t(patient.gender),
              icon: "👤",
            },
            {
              label: t("Blood Type"),
              value: patient.bloodType,
              icon: "🩸",
            },
            {
              label: t("Allergies"),
              value: patient.allergies,
              icon: "⚠️",
            },
          ].map((item) => (

            <div
              key={item.label}
              className="bg-white p-5 transition-colors hover:bg-indigo-50/30"
            >

              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-sm">
                {item.icon}
              </div>

              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {t(item.label)}
              </span>

              <strong className="mt-1 block text-sm font-bold text-slate-800">
                {item.value}
              </strong>

            </div>

          ))}

          <div className="bg-white p-5 transition-colors hover:bg-indigo-50/30 sm:col-span-2 lg:col-span-4">

            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-sm">
              🚨
            </div>

            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">{t("Emergency Contact")}</span>

            <strong className="mt-1 block text-sm font-bold text-slate-800">
              {patient.emergencyContactName
                ? `${patient.emergencyContactName} - ${patient.emergencyContactPhone}`
                : t("Not provided")}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          RECORD TABS
      ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-4 pt-4 sm:px-6">

          <div className="flex overflow-x-auto">

            {tabs.map((tab) => {

              const isActive =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`group relative flex min-w-fit items-center gap-2 px-4 py-4 text-sm font-bold transition-all duration-200 sm:px-5 ${
                    isActive
                      ? "text-indigo-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >

                  <span
                    className={`transition-transform ${
                      isActive
                        ? "scale-110"
                        : "grayscale"
                    }`}
                  >
                    {tab.icon}
                  </span>

                  <span>{t(tab.label)}</span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>

                  <span
                    className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 ${
                      isActive
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-0"
                    }`}
                  />

                </button>
              );
            })}

          </div>

        </div>


        {/* ===================================================
            MEDICAL HISTORY
        =================================================== */}

        {activeTab === "history" && (

          <div className="p-6 sm:p-7">

            <div className="mb-6">

              <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("HISTORY")}</div>

              <h3 className="mt-1 text-2xl font-black text-slate-900">{t("Medical History")}</h3>

              <p className="mt-1 text-sm text-slate-500">{t("Previous consultations and medical events.")}</p>

            </div>

            <div className="space-y-5">

              {medicalHistory.length === 0 && (
                <EmptyState
                  title={t("Nothing recorded yet")}
                  message={t("No medical history has been recorded for this patient.")}
                />
              )}

              {medicalHistory.map(
                (item, index) => (

                  <article
                    key={`${formatDate(item.date)}-${index}`}
                    className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-lg"
                  >

                    <div className="flex flex-col gap-4 md:flex-row">

                      <div className="shrink-0 md:w-40">

                        <span className="inline-flex rounded-xl bg-indigo-100 px-3 py-2 text-xs font-black text-indigo-700">
                          {formatDate(item.date)}
                        </span>

                      </div>

                      <div className="flex-1">

                        <h4 className="text-lg font-black text-slate-900">
                          {t(item.title)}
                        </h4>

                        <p className="mt-1 text-sm font-bold text-violet-600">
                          {item.doctor}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>

                      </div>

                    </div>

                  </article>

                )
              )}

            </div>

          </div>
        )}


        {/* ===================================================
            DIAGNOSES
        =================================================== */}

        {activeTab === "diagnoses" && (

          <div className="p-6 sm:p-7">

            <div className="mb-6">

              <div className="text-xs font-black tracking-[0.2em] text-violet-600">{t("CLINICAL RECORD")}</div>

              <h3 className="mt-1 text-2xl font-black text-slate-900">{t("Diagnoses")}</h3>

              <p className="mt-1 text-sm text-slate-500">{t("Diagnoses recorded during previous consultations.")}</p>

            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

              {diagnoses.length === 0 && (
                <EmptyState
                  title={t("Nothing recorded yet")}
                  message={t("No diagnoses have been recorded yet. Use \"+ Add Diagnosis\" to create one.")}
                />
              )}

              {diagnoses.map(
                (item, index) => (

                  <article
                    key={`${formatDate(item.date)}-${index}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-indigo-600">
                        🩺
                      </div>

                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                        {formatDate(item.date)}
                      </span>

                    </div>

                    <h4 className="mt-5 text-xl font-black text-slate-900">
                      {item.diagnosis}
                    </h4>

                    <p className="mt-1 text-sm font-bold text-violet-600">
                      {item.doctor}
                    </p>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">

                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">{t("Clinical Notes")}</span>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.notes}
                      </p>

                    </div>

                  </article>

                )
              )}

            </div>

          </div>
        )}


        {/* ===================================================
            PRESCRIPTIONS
        =================================================== */}

        {activeTab === "prescriptions" && (

          <div className="p-6 sm:p-7">

            <div className="mb-6">

              <div className="text-xs font-black tracking-[0.2em] text-emerald-600">{t("MEDICATION")}</div>

              <h3 className="mt-1 text-2xl font-black text-slate-900">{t("Prescriptions")}</h3>

              <p className="mt-1 text-sm text-slate-500">{t("Medications prescribed during previous visits.")}</p>

            </div>

            <div className="space-y-5">

              {prescriptions.length === 0 && (
                <EmptyState
                  title={t("Nothing recorded yet")}
                  message={t("No prescriptions have been issued yet. Use \"+ Prescribe Medication\" to create one.")}
                />
              )}

              {prescriptions.map(
                (item, index) => (

                  <article
                    key={`${formatDate(item.date)}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                      <div className="flex items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-600">
                          💊
                        </div>

                        <div>

                          <span className="text-xs font-bold text-slate-400">
                            {formatDate(item.date)}
                          </span>

                          <h4 className="mt-1 text-xl font-black text-slate-900">
                            {item.medication}
                          </h4>

                          <p className="mt-1 text-sm font-bold text-violet-600">{t("Prescribed by {doctor}", { doctor: item.doctor })}</p>

                        </div>

                      </div>

                      <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{t("Active Prescription")}</span>

                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                      {[
                        {
                          label: t("Dosage"),
                          value: item.dosage,
                        },
                        {
                          label: t("Frequency"),
                          value: t(item.frequency),
                        },
                        {
                          label: t("Duration"),
                          value: item.duration,
                        },
                      ].map((detail) => (

                        <div
                          key={detail.label}
                          className="rounded-xl bg-slate-50 p-4"
                        >

                          <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                            {t(detail.label)}
                          </span>

                          <strong className="mt-1 block text-sm font-bold text-slate-800">
                            {detail.value}
                          </strong>

                        </div>

                      ))}

                    </div>

                    {item.instructions && (

                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">

                        <span className="block text-xs font-black uppercase tracking-wider text-emerald-600">{t("Instructions")}</span>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {item.instructions}
                        </p>

                      </div>

                    )}

                  </article>

                )
              )}

            </div>

          </div>
        )}


        {/* ===================================================
            APPOINTMENTS
        =================================================== */}

        {activeTab === "appointments" && (

          <div className="p-6 sm:p-7">

            <div className="mb-6">

              <div className="text-xs font-black tracking-[0.2em] text-blue-600">{t("APPOINTMENT HISTORY")}</div>

              <h3 className="mt-1 text-2xl font-black text-slate-900">{t("Appointments")}</h3>

              <p className="mt-1 text-sm text-slate-500">{t("Previous and upcoming appointments for this patient.")}</p>

            </div>

            {appointments.length === 0 ? (
              <EmptyState
                title={t("No appointments")}
                message={t("This patient has no previous or upcoming appointments.")}
              />
            ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">

              <table className="min-w-[850px] w-full">

                <thead>

                  <tr className="border-b border-slate-100 bg-slate-50">

                    {[
                      "Date",
                      "Time",
                      "Doctor",
                      "Reason",
                      "Status",
                    ].map((heading) => (

                      <th
                        key={heading}
                        className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500"
                      >
                        {t(heading)}
                      </th>

                    ))}

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {appointments.map(
                    (appointment, index) => (

                      <tr
                        key={`${formatDate(appointment.date)}-${index}`}
                        className="transition-colors hover:bg-indigo-50/30"
                      >

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatDate(appointment.date)}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-800">
                          {t(appointment.time)}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {appointment.doctor}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {appointment.reason}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyles(
                              appointment.status
                            )}`}
                          >

                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                            {t(appointment.status)}

                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>
            )}

          </div>
        )}


        {/* ===================================================
            DOCTOR NOTES
        =================================================== */}

        {activeTab === "notes" && (

          <div className="p-6 sm:p-7">

            <div className="mb-6">

              <div className="text-xs font-black tracking-[0.2em] text-amber-600">{t("CLINICAL NOTES")}</div>

              <h3 className="mt-1 text-2xl font-black text-slate-900">{t("Doctor Notes")}</h3>

              <p className="mt-1 text-sm text-slate-500">{t("Notes and recommendations recorded by doctors.")}</p>

            </div>

            <div className="space-y-5">

              {notes.length === 0 && (
                <EmptyState
                  title={t("Nothing recorded yet")}
                  message={t("No doctor notes have been recorded for this patient.")}
                />
              )}

              {notes.map(
                (item, index) => (

                  <article
                    key={`${formatDate(item.date)}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/60 to-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg"
                  >

                    <div className="flex gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                        📝
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                          <h4 className="font-black text-slate-900">
                            {item.doctor}
                          </h4>

                          <span className="text-xs font-bold text-slate-400">
                            {formatDate(item.date)}
                          </span>

                        </div>

                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {item.note}
                        </p>

                      </div>

                    </div>

                  </article>

                )
              )}

            </div>

          </div>
        )}


        {/* ===================================================
            PATIENT MONITORING — W67
        =================================================== */}

        {activeTab === "monitoring" && (

          <div className="p-6 sm:p-7">

            <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <div className="text-xs font-black tracking-[0.2em] text-cyan-600">{t("PATIENT MONITORING")}</div>

                <h3 className="mt-1 text-2xl font-black text-slate-900">{t("Current Health Status")}</h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t("Review the patient's latest vital signs and recent health measurements.")}</p>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${
                    needsMonitoring
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >

                  <span
                    className={`h-2 w-2 animate-pulse rounded-full ${
                      needsMonitoring
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />

                  {needsMonitoring
                    ? t("Needs Monitoring")
                    : t("Patient Stable")}

                </div>

                {/* Doctors and nurses both record readings here. */}
                <Button onClick={openVitalsModal}>{t("Record Vitals")}</Button>

              </div>

            </div>


            {/* CURRENT STATUS */}

            <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-500/20">

              <div className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full border border-white/10 bg-white/5" />

              <div className="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm">
                    ❤️
                  </div>

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">{t("Overall Condition")}</p>

                    <h4 className="mt-1 text-2xl font-black">
                      {needsMonitoring
                        ? t("Needs Monitoring")
                        : t("Stable")}
                    </h4>

                    <p className="mt-1 text-sm text-blue-100">
                      {needsMonitoring
                        ? t("One or more readings are outside the expected range.")
                        : t("No abnormal readings detected in the latest check.")}
                    </p>

                  </div>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-md">

                  <span className="block text-xs font-bold text-blue-100">{t("Last Updated")}</span>

                  <strong className="mt-1 block text-sm font-black">
                    {latestMeasurement
                      ? `${latestMeasurement.date} · ${latestMeasurement.time}`
                      : t("No recordings yet")}
                  </strong>

                </div>

              </div>

            </div>


            {/* VITAL CARDS */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

              {monitoringReadings.map(
                (reading) => (

                  <article
                    key={reading.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                  >

                    <div className="flex items-start justify-between">

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${reading.iconClass}`}
                      >
                        {reading.icon}
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${reading.statusClass}`}
                      >
                        {t(reading.status)}
                      </span>

                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">
                      {t(reading.label)}
                    </p>

                    <div className="mt-1 flex items-baseline gap-1">

                      <strong className="text-2xl font-black text-slate-900">
                        {reading.value}
                      </strong>

                      <span className="text-xs font-bold text-slate-400">
                        {reading.unit}
                      </span>

                    </div>

                  </article>

                )
              )}

            </div>


            {/* MONITORING DETAILS */}

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    🟢
                  </div>

                  <div>

                    <h4 className="font-black text-slate-900">{t("Current Status")}</h4>

                    <p className="text-xs font-semibold text-slate-400">{t("Overall patient condition")}</p>

                  </div>

                </div>

                <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-bold text-slate-500">{t("Condition")}</span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        needsMonitoring
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {needsMonitoring
                        ? t("Needs Monitoring")
                        : t("Stable")}
                    </span>

                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                    <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-emerald-400 to-green-500" />

                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {needsMonitoring
                      ? t("Some measurements are outside the expected monitoring range.")
                      : t("Latest measurements are within the expected monitoring range.")}
                  </p>

                </div>

              </div>


              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    📊
                  </div>

                  <div>

                    <h4 className="font-black text-slate-900">{t("Latest Measurements")}</h4>

                    <p className="text-xs font-semibold text-slate-400">{t("Most recent recording")}</p>

                  </div>

                </div>

                <div className="mt-5 space-y-3">

                  <div className="flex items-center justify-between rounded-xl bg-white p-3">

                    <span className="text-sm font-bold text-slate-500">{t("Heart Rate")}</span>

                    <strong className="text-sm font-black text-slate-800">
                      {latestMeasurement?.heartRate ?? "—"}
                    </strong>

                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3">

                    <span className="text-sm font-bold text-slate-500">{t("Blood Pressure")}</span>

                    <strong className="text-sm font-black text-slate-800">
                      {latestMeasurement?.bloodPressure ?? "—"}
                    </strong>

                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3">

                    <span className="text-sm font-bold text-slate-500">{t("Oxygen")}</span>

                    <strong className="text-sm font-black text-slate-800">
                      {latestMeasurement?.oxygen ?? "—"}
                    </strong>

                  </div>

                </div>

              </div>


              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                    👨‍⚕️
                  </div>

                  <div>

                    <h4 className="font-black text-slate-900">{t("Monitoring Information")}</h4>

                    <p className="text-xs font-semibold text-slate-400">{t("Recording details")}</p>

                  </div>

                </div>

                <div className="mt-5 space-y-3">

                  <div className="rounded-xl bg-white p-3">

                    <span className="block text-xs font-bold text-slate-400">{t("Recorded By")}</span>

                    <strong className="mt-1 block text-sm font-black text-slate-800">
                      {latestMeasurement?.recordedBy ?? "—"}
                    </strong>

                  </div>

                  <div className="rounded-xl bg-white p-3">

                    <span className="block text-xs font-bold text-slate-400">{t("Date")}</span>

                    <strong className="mt-1 block text-sm font-black text-slate-800">
                      {latestMeasurement?.date ?? "—"}
                    </strong>

                  </div>

                  <div className="rounded-xl bg-white p-3">

                    <span className="block text-xs font-bold text-slate-400">{t("Time")}</span>

                    <strong className="mt-1 block text-sm font-black text-slate-800">
                      {latestMeasurement?.time ?? "—"}
                    </strong>

                  </div>

                </div>

              </div>

            </div>


            {/* MONITORING HISTORY */}

            <div className="mt-8">

              <div className="mb-5">

                <div className="text-xs font-black tracking-[0.2em] text-cyan-600">{t("RECENT READINGS")}</div>

                <h4 className="mt-1 text-xl font-black text-slate-900">{t("Monitoring History")}</h4>

              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">

                <table className="min-w-[950px] w-full">

                  <thead>

                    <tr className="border-b border-slate-100 bg-slate-50">

                      {[
                        "Date",
                        "Time",
                        "Heart Rate",
                        "Blood Pressure",
                        "Temperature",
                        "Oxygen",
                        "Recorded By",
                      ].map((heading) => (

                        <th
                          key={heading}
                          className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500"
                        >
                          {t(heading)}
                        </th>

                      ))}

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {monitoringHistory.map(
                      (reading) => (

                        <tr
                          key={`${reading.date}-${reading.time}`}
                          className="transition-colors hover:bg-cyan-50/30"
                        >

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {reading.date}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-800">
                            {t(reading.time)}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {reading.heartRate}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {reading.bloodPressure}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {reading.temperature}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {reading.oxygen}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {reading.recordedBy}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>


            {/* MONITORING NOTE */}

            <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5">

              <div className="flex gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100">
                  ℹ️
                </div>

                <div>

                  <h4 className="font-black text-slate-900">{t("Monitoring Summary")}</h4>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {needsMonitoring
                      ? t("One or more recent measurements need attention. Review the flagged readings and schedule a follow-up if required.")
                      : t("The latest recorded measurements indicate a stable patient condition. Continue routine monitoring and update the medical record when new measurements are available.")}
                  </p>

                </div>

              </div>

            </div>

          </div>

        )}

      </section>


      {/* =====================================================
          ADD DIAGNOSIS MODAL
      ===================================================== */}

      {/* RECORD VITAL SIGNS */}

      <Modal
        title={t("Record Vital Signs")}
        isOpen={isRecordingVitals}
        onClose={() => setIsRecordingVitals(false)}
      >
        <form onSubmit={handleVitalsSubmit} noValidate>
          <p className="mb-4 text-sm leading-6 text-slate-500">{t("Enter the readings you measured. Leave a field empty if you did not measure it.")}</p>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <div>
              <Input
                label={t("Heart rate (bpm)")}
                name="heartRate"
                type="number"
                min="20"
                max="250"
                placeholder="76"
                value={vitalsForm.heartRate}
                onChange={handleVitalsChange}
                error={vitalsErrors.heartRate}
              />
            </div>

            <div>
              <Input
                label={t("Blood pressure (mmHg)")}
                name="bloodPressure"
                placeholder="120/80"
                value={vitalsForm.bloodPressure}
                onChange={handleVitalsChange}
                error={vitalsErrors.bloodPressure}
              />
            </div>

            <div>
              <Input
                label={t("Temperature (°C)")}
                name="temperature"
                type="number"
                step="0.1"
                min="30"
                max="45"
                placeholder="36.7"
                value={vitalsForm.temperature}
                onChange={handleVitalsChange}
                error={vitalsErrors.temperature}
              />
            </div>

            <div>
              <Input
                label={t("Oxygen saturation (%)")}
                name="oxygen"
                type="number"
                min="50"
                max="100"
                placeholder="98"
                value={vitalsForm.oxygen}
                onChange={handleVitalsChange}
                error={vitalsErrors.oxygen}
              />
            </div>

            <div>
              <Input
                label={t("Weight (kg)")}
                name="weight"
                type="number"
                step="0.1"
                min="1"
                max="500"
                placeholder="72"
                value={vitalsForm.weight}
                onChange={handleVitalsChange}
                error={vitalsErrors.weight}
              />
            </div>

            <div>
              <Input
                label={t("Date measured")}
                name="date"
                type="date"
                max={getTodayDate()}
                value={vitalsForm.date}
                onChange={handleVitalsChange}
                required
                error={vitalsErrors.date}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsRecordingVitals(false)}
            >{t("Cancel")}</Button>

            <Button type="submit">{t("Save Readings")}</Button>
          </div>
        </form>
      </Modal>

      {showDiagnosisModal && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDiagnosisModal();
            }
          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Add diagnosis")}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >

            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 px-6 py-6 text-white sm:px-8">

              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/5" />

              <div className="relative flex items-start justify-between gap-4">

                <div>

                  <div className="mb-2 text-xs font-black tracking-[0.2em] text-indigo-100">{t("MEDICAL RECORD")}</div>

                  <h2 className="text-2xl font-black">{t("Add Diagnosis")}</h2>

                  <p className="mt-2 text-sm leading-6 text-indigo-100">{t("Add a new diagnosis to this patient's medical record.")}</p>

                </div>

                <button
                  type="button"
                  onClick={closeDiagnosisModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-bold text-white transition hover:bg-white/20"
                  aria-label={t("Close diagnosis modal")}
                >
                  ×
                </button>

              </div>

            </div>

            <form
              noValidate
              onSubmit={handleDiagnosisSubmit}
              className="space-y-6 p-6 sm:p-8"
            >

              <div>

                <label
                  htmlFor="diagnosis"
                  className="mb-2 block text-sm font-black text-slate-700"
                >{t("Diagnosis")}<span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  id="diagnosis"
                  name="diagnosis"
                  type="text"
                  value={diagnosisForm.diagnosis}
                  onChange={handleDiagnosisChange}
                  placeholder={t("e.g. Tension Headache")}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                    diagnosisErrors.diagnosis
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />

                {diagnosisErrors.diagnosis && (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    {diagnosisErrors.diagnosis}
                  </p>
                )}

              </div>

              <div>

                <label
                  htmlFor="diagnosis-date"
                  className="mb-2 block text-sm font-black text-slate-700"
                >{t("Diagnosis Date")}<span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  id="diagnosis-date"
                  name="date"
                  type="date"
                  max={getTodayDate()}
                  value={diagnosisForm.date}
                  onChange={handleDiagnosisChange}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-4 ${
                    diagnosisErrors.date
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />

                {diagnosisErrors.date && (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    {diagnosisErrors.date}
                  </p>
                )}

              </div>

              <div>

                <label
                  htmlFor="diagnosis-notes"
                  className="mb-2 block text-sm font-black text-slate-700"
                >{t("Clinical Notes")}<span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <textarea
                  id="diagnosis-notes"
                  name="notes"
                  rows="5"
                  value={diagnosisForm.notes}
                  onChange={handleDiagnosisChange}
                  placeholder={t("Enter clinical observations, symptoms, and relevant notes...")}
                  className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                    diagnosisErrors.notes
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />

                {diagnosisErrors.notes && (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    {diagnosisErrors.notes}
                  </p>
                )}

              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white">
                    {getInitials(patient.name)}
                  </div>

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      {patient.name}
                    </p>

                    <p className="text-xs font-semibold text-slate-500">{t("Patient ID: {id}", { id: patient.id })}</p>

                  </div>

                </div>

              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeDiagnosisModal}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >{t("Cancel")}</button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl"
                >{t("Save Diagnosis")}</button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          PRESCRIBE MEDICATION MODAL
      ===================================================== */}

      {showPrescriptionModal && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePrescriptionModal();
            }
          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Prescribe medication")}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 px-6 py-6 text-white sm:px-8">

              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/5" />

              <div className="relative flex items-start justify-between gap-4">

                <div>

                  <div className="mb-2 text-xs font-black tracking-[0.2em] text-emerald-100">{t("MEDICATION MANAGEMENT")}</div>

                  <h2 className="text-2xl font-black">{t("Prescribe Medication")}</h2>

                  <p className="mt-2 text-sm leading-6 text-emerald-100">{t("Add a new prescription to this patient's medical record.")}</p>

                </div>

                <button
                  type="button"
                  onClick={closePrescriptionModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-bold text-white transition hover:bg-white/20"
                  aria-label={t("Close prescription modal")}
                >
                  ×
                </button>

              </div>

            </div>

            <form
              noValidate
              onSubmit={handlePrescriptionSubmit}
              className="space-y-6 p-6 sm:p-8"
            >

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="medication"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >{t("Medication Name")}<span className="ml-1 text-rose-500">
                      *
                    </span>
                  </label>

                  <input
                    id="medication"
                    name="medication"
                    type="text"
                    value={
                      prescriptionForm.medication
                    }
                    onChange={
                      handlePrescriptionChange
                    }
                    placeholder={t("e.g. Paracetamol 500mg")}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      prescriptionErrors.medication
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                    }`}
                  />

                  {prescriptionErrors.medication && (
                    <p className="mt-2 text-xs font-bold text-rose-600">
                      {
                        prescriptionErrors.medication
                      }
                    </p>
                  )}

                </div>

                <div>

                  <label
                    htmlFor="dosage"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >{t("Dosage")}<span className="ml-1 text-rose-500">
                      *
                    </span>
                  </label>

                  <input
                    id="dosage"
                    name="dosage"
                    type="text"
                    value={prescriptionForm.dosage}
                    onChange={
                      handlePrescriptionChange
                    }
                    placeholder={t("e.g. 1 tablet / 500 mg")}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      prescriptionErrors.dosage
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                    }`}
                  />

                  {prescriptionErrors.dosage && (
                    <p className="mt-2 text-xs font-bold text-rose-600">
                      {
                        prescriptionErrors.dosage
                      }
                    </p>
                  )}

                </div>

              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="frequency"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >{t("Frequency")}<span className="ml-1 text-rose-500">
                      *
                    </span>
                  </label>

                  <select
                    id="frequency"
                    name="frequency"
                    value={
                      prescriptionForm.frequency
                    }
                    onChange={
                      handlePrescriptionChange
                    }
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-4 ${
                      prescriptionErrors.frequency
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                    }`}
                  >

                    <option value="">{t("Select frequency")}</option>

                    <option value="Once daily">{t("Once daily")}</option>

                    <option value="Twice daily">{t("Twice daily")}</option>

                    <option value="Three times daily">{t("Three times daily")}</option>

                    <option value="Every 4 hours">{t("Every 4 hours")}</option>

                    <option value="Every 6 hours">{t("Every 6 hours")}</option>

                    <option value="Every 8 hours">{t("Every 8 hours")}</option>

                    <option value="Every 12 hours">{t("Every 12 hours")}</option>

                    <option value="As needed">{t("As needed")}</option>

                  </select>

                  {prescriptionErrors.frequency && (
                    <p className="mt-2 text-xs font-bold text-rose-600">
                      {
                        prescriptionErrors.frequency
                      }
                    </p>
                  )}

                </div>

                <div>

                  <label
                    htmlFor="duration"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >{t("Duration")}<span className="ml-1 text-rose-500">
                      *
                    </span>
                  </label>

                  <input
                    id="duration"
                    name="duration"
                    type="text"
                    value={
                      prescriptionForm.duration
                    }
                    onChange={
                      handlePrescriptionChange
                    }
                    placeholder={t("e.g. 5 days / 30 days")}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      prescriptionErrors.duration
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                    }`}
                  />

                  {prescriptionErrors.duration && (
                    <p className="mt-2 text-xs font-bold text-rose-600">
                      {
                        prescriptionErrors.duration
                      }
                    </p>
                  )}

                </div>

              </div>

              <div>

                <label
                  htmlFor="prescription-date"
                  className="mb-2 block text-sm font-black text-slate-700"
                >{t("Prescription Date")}<span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  id="prescription-date"
                  name="date"
                  type="date"
                  max={getTodayDate()}
                  value={prescriptionForm.date}
                  onChange={
                    handlePrescriptionChange
                  }
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-4 ${
                    prescriptionErrors.date
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                  }`}
                />

                {prescriptionErrors.date && (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    {prescriptionErrors.date}
                  </p>
                )}

              </div>

              <div>

                <label
                  htmlFor="prescription-instructions"
                  className="mb-2 block text-sm font-black text-slate-700"
                >{t("Instructions")}<span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <textarea
                  id="prescription-instructions"
                  name="instructions"
                  rows="4"
                  value={
                    prescriptionForm.instructions
                  }
                  onChange={
                    handlePrescriptionChange
                  }
                  placeholder={t("e.g. Take with water after food...")}
                  className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                    prescriptionErrors.instructions
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                  }`}
                />

                {prescriptionErrors.instructions && (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    {
                      prescriptionErrors.instructions
                    }
                  </p>
                )}

              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-sm font-black text-white">
                    {getInitials(patient.name)}
                  </div>

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      {patient.name}
                    </p>

                    <p className="text-xs font-semibold text-slate-500">{t("Patient ID: {id}", { id: patient.id })}</p>

                  </div>

                </div>

              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closePrescriptionModal}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >{t("Cancel")}</button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl"
                >{t("Save Prescription")}</button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

function PatientRecordPage({ view }) {
  const { id } = useParams();
  const patient = getPatientById(id);

  if (!patient) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-8">
        <PageHeader
          eyebrow={t("Doctor Workspace")}
          title={t("Patient Not Found")}
        />

        <EmptyState
          icon="🔍"
          title={t("Patient not found")}
          message={t("No patient exists with ID \"{id}\".", { id })}
          action={
            <Link
              to="/doctor/patients"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
            >{t("Back to Patients")}</Link>
          }
        />
      </div>
    );
  }

  // Keyed by patient so the record resets when the doctor
  // moves between patients.
  return (
    <PatientRecord
      key={patient.id}
      patient={patient}
      view={view}
    />
  );
}

export default PatientRecordPage;