import { useMemo, useState } from "react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Tabs from "../../components/common/Tabs";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { getPatientRecordsView } from "../../data/medicalRecordsData";
import { getPatientById } from "../../data/patientsData";
import { formatDate } from "../../utils/date";

import { t } from "../../i18n";
function MedicalRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const patientId = useCurrentPatientId();

  const [records] = useState(() => getPatientRecordsView(patientId));
  const [patient] = useState(() => getPatientById(patientId));
  const {
    medicalHistory,
    diagnoses,
    prescriptions,
    appointmentHistory,
    medicalNotes,
  } = records;

  const normalizedSearch = searchTerm
    .trim()
    .toLowerCase();

  const filteredMedicalHistory = useMemo(() => {
    if (!normalizedSearch) {
      return medicalHistory;
    }

    return medicalHistory.filter((record) =>
      [
        record.date,
        record.doctor,
        record.department,
        record.diagnosis,
        record.notes,
        record.prescription,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, medicalHistory]);

  const filteredDiagnoses = useMemo(() => {
    if (!normalizedSearch) {
      return diagnoses;
    }

    return diagnoses.filter((item) =>
      [
        item.diagnosis,
        item.doctor,
        item.department,
        item.date,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, diagnoses]);

  const filteredPrescriptions = useMemo(() => {
    if (!normalizedSearch) {
      return prescriptions;
    }

    return prescriptions.filter((item) => {
      const prescriptionText = [
        item.medicine,
        item.dosage,
        item.frequency,
        item.duration,
        item.status,
        item.doctor,
        item.date,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      return prescriptionText.includes(normalizedSearch);
    });
  }, [normalizedSearch, prescriptions]);

  const filteredAppointmentHistory = useMemo(() => {
    if (!normalizedSearch) {
      return appointmentHistory;
    }

    return appointmentHistory.filter((item) =>
      [
        item.date,
        item.time,
        item.doctor,
        item.department,
        item.appointmentType,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, appointmentHistory]);

  const filteredMedicalNotes = useMemo(() => {
    if (!normalizedSearch) {
      return medicalNotes;
    }

    return medicalNotes.filter((item) =>
      [
        item.date,
        item.doctor,
        item.department,
        item.diagnosis,
        item.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, medicalNotes]);

  const searchTargetTab = useMemo(() => {
    if (!normalizedSearch) {
      return null;
    }

    if (filteredMedicalHistory.length > 0) {
      return 0;
    }

    if (filteredDiagnoses.length > 0) {
      return 1;
    }

    if (filteredPrescriptions.length > 0) {
      return 2;
    }

    if (filteredAppointmentHistory.length > 0) {
      return 3;
    }

    if (filteredMedicalNotes.length > 0) {
      return 4;
    }

    return null;
  }, [
    normalizedSearch,
    filteredMedicalHistory,
    filteredDiagnoses,
    filteredPrescriptions,
    filteredAppointmentHistory,
    filteredMedicalNotes,
  ]);

  const historyContent = (
    <div className="space-y-6">

      {filteredMedicalHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-2xl">
            🩺
          </div>

          <h3 className="text-lg font-bold text-slate-900">{t("No medical history found")}</h3>

          <p className="mt-2 max-w-md text-sm text-slate-500">{t("No medical history records match your current search.")}</p>

        </div>
      ) : (
        <div className="space-y-6">

          {filteredMedicalHistory.map((record) => (
            <article
              className="relative grid grid-cols-1 gap-4 md:grid-cols-[150px_24px_1fr]"
              key={record.id}
            >

              {/* Date */}

              <div className="text-sm font-bold text-cyan-700 md:pt-5">
                {record.date}
              </div>

              {/* Timeline */}

              <div className="relative hidden md:block">

                <div className="absolute left-1/2 top-5 h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-cyan-400 to-emerald-400" />

                <div className="absolute left-1/2 top-5 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-cyan-500 shadow-md" />

              </div>

              {/* Content */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {record.diagnosis}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {record.doctor} · {t(record.department)}
                    </p>

                  </div>

                  <Badge variant="info">
                    {record.recordType}
                  </Badge>

                </div>


                <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3">

                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Record Type")}</span>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {record.recordType}
                    </p>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Notes")}</span>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {record.notes}
                    </p>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Prescription")}</span>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {record.prescription}
                    </p>
                  </div>

                </div>

              </div>

            </article>
          ))}

        </div>
      )}

    </div>
  );

  const diagnosesContent = (
    <div className="space-y-4">

      {filteredDiagnoses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl">
            🔎
          </div>

          <h3 className="text-lg font-bold text-slate-900">{t("No diagnoses found")}</h3>

          <p className="mt-2 max-w-md text-sm text-slate-500">{t("No diagnosis records match your current search.")}</p>

        </div>
      ) : (
        filteredDiagnoses.map((item, index) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"
            key={index}
          >

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <h3 className="text-lg font-bold text-slate-900">
                  {item.diagnosis}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {item.doctor} · {t(item.department)}
                </p>

              </div>

              <Badge variant="success">
                {t(item.status)}
              </Badge>

            </div>


            <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-gradient-to-r from-cyan-50 to-emerald-50 p-4 sm:grid-cols-3">

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.date}
                </strong>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Doctor")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.doctor}
                </strong>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Department")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {t(item.department)}
                </strong>
              </div>

            </div>

          </article>
        ))
      )}

    </div>
  );

  const prescriptionsContent = (
    <div className="space-y-4">

      {filteredPrescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            💊
          </div>

          <h3 className="text-lg font-bold text-slate-900">{t("No prescriptions found")}</h3>

          <p className="mt-2 max-w-md text-sm text-slate-500">{t("No prescription records match your current search.")}</p>

        </div>
      ) : (
        filteredPrescriptions.map((item, index) => (
          <article
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
            key={index}
          >

            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-5 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <h3 className="text-lg font-bold text-slate-900">
                  {item.medicine}
                </h3>

                <p className="mt-1 text-sm text-slate-500">{t("Prescribed by {doctor}", { doctor: item.doctor })}</p>

              </div>

              <Badge variant="success">
                {t(item.status)}
              </Badge>

            </div>


            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Dosage")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.dosage}
                </strong>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Frequency")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.frequency}
                </strong>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Duration")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.duration}
                </strong>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date Prescribed")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.date}
                </strong>
              </div>

            </div>

          </article>
        ))
      )}

    </div>
  );

  const appointmentsContent = (
    <div>

      <div className="mb-5">

        <h3 className="text-lg font-bold text-slate-900">{t("Appointment History")}</h3>

        <p className="mt-1 text-sm text-slate-500">{t("View your completed medical appointments and visit details.")}</p>

      </div>


      {filteredAppointmentHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-2xl">
            📅
          </div>

          <h3 className="text-lg font-bold text-slate-900">{t("No appointment history found")}</h3>

          <p className="mt-2 max-w-md text-sm text-slate-500">{t("No appointment history records match your current search.")}</p>

        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">

          <table className="min-w-full divide-y divide-slate-200">

            <thead className="bg-slate-50">

              <tr>

                <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("Date")}</th>

                <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("Time")}</th>

                <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("Doctor")}</th>

                <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("Department")}</th>

                <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("Appointment")}</th>

                <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("Status")}</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">

              {filteredAppointmentHistory.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-cyan-50/40"
                >

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                    {item.date}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {t(item.time)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                    {item.doctor}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {t(item.department)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {item.appointmentType}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <Badge variant="success">
                      {t(item.status)}
                    </Badge>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );

  const medicalNotesContent = (
    <div className="space-y-4">

      {filteredMedicalNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl">
            📝
          </div>

          <h3 className="text-lg font-bold text-slate-900">{t("No medical notes found")}</h3>

          <p className="mt-2 max-w-md text-sm text-slate-500">{t("No medical notes match your current search.")}</p>

        </div>
      ) : (
        filteredMedicalNotes.map((item) => (
          <article
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"
            key={item.id}
          >

            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-emerald-50 p-5 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <h3 className="text-lg font-bold text-slate-900">
                  {item.diagnosis}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {item.doctor} · {t(item.department)}
                </p>

              </div>

              <Badge variant="info">{t("Medical Note")}</Badge>

            </div>


            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.date}
                </strong>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Doctor")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {item.doctor}
                </strong>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Department")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {t(item.department)}
                </strong>
              </div>

            </div>


            <div className="border-t border-slate-100 p-5">

              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Medical Note")}</span>

              <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                {item.note}
              </p>

            </div>

          </article>
        ))
      )}

    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* Page Header */}

      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 p-6 text-white shadow-xl shadow-cyan-500/10 sm:p-8">

        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("Medical Records")}</h1>

        <p className="mt-2 max-w-2xl text-sm text-cyan-50 sm:text-base">{t("View your medical history, diagnoses, prescriptions, and appointment history.")}</p>

      </div>


      {/* Patient Information */}

      <section>

        <Card title={t("Patient Information")}>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Patient Name")}</span>

              <strong className="mt-2 block text-base font-bold text-slate-900">
                {patient?.name || "—"}
              </strong>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Patient ID")}</span>

              <strong className="mt-2 block text-base font-bold text-slate-900">
                {patient ? `P-${String(patient.id).padStart(5, "0")}` : "—"}
              </strong>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date of Birth")}</span>

              <strong className="mt-2 block text-base font-bold text-slate-900">
                {patient ? formatDate(patient.dateOfBirth) : "—"}
              </strong>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-emerald-50 p-5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Blood Type")}</span>

              <strong className="mt-2 block text-xl font-black text-cyan-700">
                {patient?.bloodType || "—"}
              </strong>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Allergies")}</span>

              <strong className="mt-2 block text-base font-bold text-emerald-600">
                {patient?.allergies || t("None recorded")}
              </strong>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Last Updated")}</span>

              <strong className="mt-2 block text-base font-bold text-slate-900">
                {medicalHistory[0]?.date || t("No records yet")}
              </strong>
            </div>

          </div>

        </Card>

      </section>


      {/* Medical Records Search */}

      <section>

        <Card title={t("Search Medical Records")}>

          <div>

            <p className="mb-4 text-sm text-slate-500">{t("Search by doctor, department, diagnosis, prescription, notes, or date.")}</p>

            <div className="relative">

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="search"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                placeholder={t("Search medical records...")}
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                aria-label={t("Search medical records")}
              />

            </div>


            {searchTerm && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800 sm:flex-row sm:items-center sm:justify-between">

                <span>{t("Showing matching records for:")} <strong className="font-bold">
                    {searchTerm}
                  </strong>
                </span>

                <button
                  type="button"
                  className="font-bold text-cyan-700 transition-colors hover:text-cyan-900"
                  onClick={() => setSearchTerm("")}
                >{t("Clear Search")}</button>

              </div>
            )}

          </div>

        </Card>

      </section>


      {/* Medical Records */}

      <section>

        <Card title={t("Medical History")}>

          <Tabs
            activeTab={searchTargetTab}
            tabs={[
              {
                label: t("Medical History"),
                content: historyContent,
              },
              {
                label: t("Diagnoses"),
                content: diagnosesContent,
              },
              {
                label: t("Prescriptions"),
                content: prescriptionsContent,
              },
              {
                label: t("Appointments"),
                content: appointmentsContent,
              },
              {
                label: t("Medical Notes"),
                content: medicalNotesContent,
              },
            ]}
          />

        </Card>

      </section>

    </div>
  );
}

export default MedicalRecords;