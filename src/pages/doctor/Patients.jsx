import { useState } from "react";
import { Link } from "react-router-dom";
import { loadAppointments } from "../../data/appointmentData";
import { getAge, loadPatients } from "../../data/patientsData";
import { formatShortDate } from "../../utils/date";

import { t } from "../../i18n";
// Patients with their age and most recent completed visit.
const getPatientList = () => {
  const appointments = loadAppointments();

  return loadPatients().map((patient) => {
    const lastVisit = appointments
      .filter(
        (appointment) =>
          appointment.patientId === patient.id &&
          appointment.status === "Completed"
      )
      .map((appointment) => appointment.date)
      .sort()
      .pop();

    return {
      ...patient,
      age: getAge(patient.dateOfBirth),
      lastAppointment: lastVisit ? formatShortDate(lastVisit) : t("No visits yet"),
    };
  });
};

function DoctorPatients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [patients] = useState(getPatientList);

  const filteredPatients = patients.filter((patient) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      patient.name.toLowerCase().includes(search) ||
      patient.email.toLowerCase().includes(search) ||
      patient.phone.toLowerCase().includes(search);

    const matchesGender =
      genderFilter === "All" ||
      patient.gender === genderFilter;

    const matchesStatus =
      statusFilter === "All" ||
      patient.status === statusFilter;

    return (
      matchesSearch &&
      matchesGender &&
      matchesStatus
    );
  });

  const clearFilters = () => {
    setSearchTerm("");
    setGenderFilter("All");
    setStatusFilter("All");
  };

  const totalPatients = patients.length;

  const activePatients = patients.filter(
    (patient) => patient.status === "Active"
  ).length;

  const malePatients = patients.filter(
    (patient) => patient.gender === "Male"
  ).length;

  const femalePatients = patients.filter(
    (patient) => patient.gender === "Female"
  ).length;

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    genderFilter !== "All" ||
    statusFilter !== "All";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 p-6 text-white shadow-2xl shadow-indigo-500/20 sm:p-8">

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute -bottom-32 right-24 h-80 w-80 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute right-1/3 top-10 h-28 w-28 rounded-full border border-white/10" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div className="max-w-2xl">

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur-md">

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />{t("DOCTOR WORKSPACE")}</div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("Patients")}</h1>

            <p className="mt-3 text-sm leading-6 text-indigo-100 sm:text-base">{t("View and search patients assigned to your care.")}</p>

          </div>


          <div className="hidden h-32 w-32 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-5xl shadow-xl backdrop-blur-md lg:flex">
            👥
          </div>

        </div>

      </section>


      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total */}

        <div className="group relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="block text-sm font-semibold text-slate-500">{t("Total Patients")}</span>

              <strong className="mt-2 block text-4xl font-black tracking-tight text-slate-900">
                {totalPatients}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Patients assigned to you")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              👥
            </div>

          </div>

        </div>


        {/* Active */}

        <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="block text-sm font-semibold text-slate-500">{t("Active Patients")}</span>

              <strong className="mt-2 block text-4xl font-black tracking-tight text-slate-900">
                {activePatients}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Currently under care")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              ✓
            </div>

          </div>

        </div>


        {/* Male */}

        <div className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="block text-sm font-semibold text-slate-500">{t("Male Patients")}</span>

              <strong className="mt-2 block text-4xl font-black tracking-tight text-slate-900">
                {malePatients}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Male patients")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              ♂
            </div>

          </div>

        </div>


        {/* Female */}

        <div className="group relative overflow-hidden rounded-3xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="block text-sm font-semibold text-slate-500">{t("Female Patients")}</span>

              <strong className="mt-2 block text-4xl font-black tracking-tight text-slate-900">
                {femalePatients}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Female patients")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-100 text-2xl text-fuchsia-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              ♀
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          SEARCH & FILTERS
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

          <div className="flex flex-col gap-2">

            <div className="text-xs font-black tracking-[0.2em] text-violet-600">{t("PATIENT MANAGEMENT")}</div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("Search & Filters")}</h2>

            <p className="text-sm text-slate-500">{t("Find patients by name, email, phone number, gender, or status.")}</p>

          </div>

        </div>


        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-[minmax(280px,2fr)_1fr_1fr_auto]">

          {/* Search */}

          <div>

            <label
              htmlFor="patient-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >{t("Search Patients")}</label>

            <div className="relative">

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                🔍
              </span>

              <input
                id="patient-search"
                type="text"
                placeholder={t("Search by name, email or phone...")}
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

          </div>


          {/* Gender */}

          <div>

            <label
              htmlFor="patient-gender"
              className="mb-2 block text-sm font-bold text-slate-700"
            >{t("Gender")}</label>

            <div className="relative">

              <select
                id="patient-gender"
                value={genderFilter}
                onChange={(event) =>
                  setGenderFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="All">{t("All Genders")}</option>
                <option value="Male">{t("Male")}</option>
                <option value="Female">{t("Female")}</option>
              </select>

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                ▾
              </span>

            </div>

          </div>


          {/* Status */}

          <div>

            <label
              htmlFor="patient-status"
              className="mb-2 block text-sm font-bold text-slate-700"
            >{t("Status")}</label>

            <div className="relative">

              <select
                id="patient-status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="All">{t("All Statuses")}</option>
                <option value="Active">{t("Active")}</option>
                <option value="Inactive">{t("Inactive")}</option>
              </select>

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                ▾
              </span>

            </div>

          </div>


          {/* Clear */}

          <div className="flex items-end">

            <button
              type="button"
              className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200 ${
                hasActiveFilters
                  ? "border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
                  : "border border-slate-200 bg-slate-50 text-slate-400"
              }`}
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >{t("Clear Filters")}</button>

          </div>

        </div>


        {/* Filter status */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">

          <div className="flex items-center gap-2 text-sm text-slate-500">

            <span className="h-2 w-2 rounded-full bg-indigo-500" />{t("Showing")} <strong className="font-black text-slate-800">
              {filteredPatients.length}
            </strong> {t("of")} <strong className="font-black text-slate-800">
              {patients.length}
            </strong> {t("patients")}</div>


          {hasActiveFilters && (
            <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700">{t("Filters active")}</span>
          )}

        </div>

      </section>


      {/* =====================================================
          PATIENT LIST
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">

          <div>

            <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("PATIENT RECORDS")}</div>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Patient List")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Showing {length} of {length2} patients.", { length: filteredPatients.length, length2: patients.length })}</p>

          </div>


          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-indigo-600">
            👥
          </div>

        </div>


        {/* ===================================================
            EMPTY STATE
            =================================================== */}

        {filteredPatients.length === 0 ? (

          <div className="px-6 py-16 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
              👥
            </div>

            <h3 className="mt-6 text-xl font-black text-slate-900">{t("No Patients Found")}</h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t("No patients match your current search or filter criteria.")}</p>

            <button
              type="button"
              className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
              onClick={clearFilters}
            >{t("Clear Filters")}</button>

          </div>

        ) : (

          /* =================================================
             PATIENT TABLE
             ================================================= */

          <div className="overflow-x-auto">

            <table className="min-w-[1050px] w-full">

              <thead>

                <tr className="border-b border-slate-100 bg-slate-50/70">

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Patient")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Age")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Gender")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Contact")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Last Appointment")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Status")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Action")}</th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {filteredPatients.map((patient) => (

                  <tr
                    key={patient.id}
                    className="group transition-colors hover:bg-indigo-50/30"
                  >

                    {/* Patient */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-md transition-transform duration-300 group-hover:scale-105">
                          {patient.name.charAt(0)}
                        </div>

                        <div className="min-w-0">

                          <strong className="block truncate text-sm font-bold text-slate-900">
                            {patient.name}
                          </strong>

                          <span className="mt-0.5 block text-xs font-medium text-slate-400">{t("Patient #")}{String(patient.id).padStart(3, "0")}
                          </span>

                        </div>

                      </div>

                    </td>


                    {/* Age */}

                    <td className="px-6 py-5">

                      <span className="text-sm font-semibold text-slate-700">
                        {patient.age}
                      </span>

                    </td>


                    {/* Gender */}

                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                          patient.gender === "Male"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                        }`}
                      >

                        <span>
                          {patient.gender === "Male"
                            ? "♂"
                            : "♀"}
                        </span>

                        {t(patient.gender)}

                      </span>

                    </td>


                    {/* Contact */}

                    <td className="px-6 py-5">

                      <div className="min-w-[220px]">

                        <span className="block truncate text-sm font-medium text-slate-700">
                          {patient.email}
                        </span>

                        <span className="mt-1 block text-xs font-medium text-slate-400">
                          {patient.phone}
                        </span>

                      </div>

                    </td>


                    {/* Appointment */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-2">

                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm text-indigo-600">
                          📅
                        </span>

                        <span className="text-sm font-semibold text-slate-700">
                          {patient.lastAppointment}
                        </span>

                      </div>

                    </td>


                    {/* Status */}

                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                          patient.status === "Active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >

                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            patient.status === "Active"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />

                        {t(patient.status)}

                      </span>

                    </td>


                    {/* Action */}

                    <td className="px-6 py-5">

                      <Link
                        to={`/doctor/patients/${patient.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                      >{t("View Record")}<span className="transition-transform duration-200 group-hover:translate-x-1">
                          →
                        </span>
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default DoctorPatients;