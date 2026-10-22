import { useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../context/useAuth";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { useUnreadMessages } from "../../hooks/useUnreadMessages";
import {
  formatAppointmentDate,
  getPatientAppointments,
  isUpcoming,
} from "../../data/appointmentData";
import {
  getActivePrescriptions,
  getRecentMedicalUpdates,
} from "../../data/medicalRecordsData";

import { t } from "../../i18n";
const getInitials = (name) =>
  name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function PatientDashboard() {
  const { user } = useAuth();
  const patientId = useCurrentPatientId();
  const unreadMessages = useUnreadMessages(user);

  const [appointments] = useState(() => getPatientAppointments(patientId));
  const [prescriptions] = useState(() =>
    getActivePrescriptions(patientId).map((item) => ({
      key: item.id,
      medicine: item.medication,
      dosage: item.dosage,
      frequency: item.frequency,
    }))
  );
  const [medicalUpdates] = useState(() =>
    getRecentMedicalUpdates(patientId)
  );

  // Next confirmed or pending appointment from today onwards.
  const upcomingAppointment = appointments.find(isUpcoming);

  const recentAppointments = appointments
    .filter((appointment) => appointment.status === "Completed")
    .reverse()
    .slice(0, 3);

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* =====================================================
          PAGE HEADER / HERO
          ===================================================== */}

      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 p-6 text-white shadow-xl shadow-emerald-500/15 sm:p-8 lg:p-10">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-32 right-24 h-64 w-64 rounded-full bg-cyan-200/10 blur-3xl" />

          <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="absolute right-16 top-12 h-2 w-2 rounded-full bg-white/60 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

          <div className="absolute right-40 top-32 h-1.5 w-1.5 rounded-full bg-white/50" />

          <div className="absolute bottom-16 right-72 h-2 w-2 rounded-full bg-cyan-100/50" />
        </div>

        <div className="relative z-10 flex min-h-[250px] items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-200 shadow-[0_0_10px_rgba(167,243,208,0.9)]" />{t("Patient Health Center")}</div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{t("Patient Dashboard")}</h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50 sm:text-base">{user?.name
              ? t("Welcome back, {name}. Here is an overview of your healthcare information.", { name: user.name.split(" ")[0] })
              : t("Welcome back. Here is an overview of your healthcare information.")}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/patient/appointments"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >{t("Book Appointment")}<span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                to="/patient/medical-records"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20"
              >{t("View Records")}</Link>
            </div>
          </div>

          {/* Hero Heart */}
          <div className="relative hidden h-48 w-48 shrink-0 items-center justify-center lg:flex">
            <div className="absolute h-44 w-44 rounded-full border border-white/20 animate-[spin_18s_linear_infinite]" />

            <div className="absolute h-32 w-32 rounded-full border border-dashed border-white/25 animate-[spin_12s_linear_infinite_reverse]" />

            <div className="absolute h-24 w-24 rounded-full bg-white/10 shadow-2xl shadow-emerald-950/20 backdrop-blur-md" />

            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/30 bg-white/15 text-5xl shadow-xl backdrop-blur-md">
              ♥
            </div>

            <div className="absolute right-1 top-5 h-3 w-3 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)]" />

            <div className="absolute bottom-4 left-3 h-2 w-2 rounded-full bg-cyan-100 shadow-[0_0_15px_rgba(207,250,254,0.8)]" />
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK ACTIONS
          ===================================================== */}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">{t("Healthcare Shortcuts")}</div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("Quick Actions")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Quickly access the healthcare services you use most.")}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Appointment */}
          <Link
            to="/patient/appointments"
            className="group relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50/70 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-100/70 blur-2xl transition-transform duration-500 group-hover:scale-150" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-2xl shadow-lg shadow-cyan-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                📅
              </div>

              <div className="min-w-0 flex-1">
                <strong className="block text-base font-extrabold text-slate-900">{t("Book Appointment")}</strong>

                <small className="mt-1 block text-xs text-slate-500">{t("Schedule a visit")}</small>
              </div>

              <span className="text-xl font-bold text-cyan-500 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          {/* Medical Records */}
          <Link
            to="/patient/medical-records"
            className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl transition-transform duration-500 group-hover:scale-150" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                📋
              </div>

              <div className="min-w-0 flex-1">
                <strong className="block text-base font-extrabold text-slate-900">{t("Medical Records")}</strong>

                <small className="mt-1 block text-xs text-slate-500">{t("View your health history")}</small>
              </div>

              <span className="text-xl font-bold text-emerald-500 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          {/* Feedback */}
          <Link
            to="/patient/feedback"
            className="group relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/70 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/10"
          >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-100/70 blur-2xl transition-transform duration-500 group-hover:scale-150" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-2xl shadow-lg shadow-teal-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                💬
              </div>

              <div className="min-w-0 flex-1">
                <strong className="block text-base font-extrabold text-slate-900">{t("Send Feedback")}</strong>

                <small className="mt-1 block text-xs text-slate-500">{t("Share your experience")}</small>
              </div>

              <span className="text-xl font-bold text-teal-500 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* =====================================================
          DASHBOARD GRID
          ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ===================================================
            UPCOMING APPOINTMENT
            =================================================== */}

        <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-600">{t("Next Visit")}</div>

              <h2 className="text-xl font-extrabold text-slate-900">{t("Upcoming Appointment")}</h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-xl shadow-lg shadow-cyan-500/20">
              📅
            </div>
          </div>

          {upcomingAppointment ? (
            <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-extrabold text-white shadow-lg">
                {getInitials(upcomingAppointment.doctor)}
              </div>

              <div>
                <strong className="block text-sm font-bold text-slate-900">
                  {upcomingAppointment.doctor}
                </strong>

                <p className="mt-0.5 text-xs text-slate-500">
                  {t(upcomingAppointment.department)}
                </p>
              </div>
            </div>

            <Badge
              variant={
                upcomingAppointment.status === "Confirmed"
                  ? "success"
                  : "warning"
              }
            >
              {t(upcomingAppointment.status)}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("Date")}</span>

              <strong className="text-sm text-slate-800">
                {formatAppointmentDate(upcomingAppointment.date)}
              </strong>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("Time")}</span>

              <strong className="text-sm text-slate-800">
                {t(upcomingAppointment.time)}
              </strong>
            </div>
          </div>

            </>
          ) : (
            <EmptyState
              icon="📅"
              title={t("No upcoming appointments")}
              message={t("You have no confirmed or pending appointments.")}
              action={
                <Link
                  to="/patient/appointments/book"
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md"
                >{t("Book an Appointment")}</Link>
              }
            />
          )}

          <div className="mt-5 border-t border-slate-100 pt-5">
            <Link
              to="/patient/appointments"
              className="group/link inline-flex items-center gap-2 text-sm font-bold text-cyan-600 transition-colors hover:text-emerald-600"
            >{t("View All Appointments")}<span className="transition-transform duration-200 group-hover/link:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* ===================================================
            HEALTH STATUS
            =================================================== */}

        <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">{t("Wellness")}</div>

              <h2 className="text-xl font-extrabold text-slate-900">{t("Health Status")}</h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-xl text-white shadow-lg shadow-emerald-500/20">
              ♥
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 p-2 shadow-lg shadow-emerald-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                <div className="text-center">
                  <span className="block text-2xl font-black text-emerald-600">{t("Good")}</span>

                  <small className="text-xs font-medium text-slate-400">{t("Status")}</small>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <strong className="text-base font-extrabold text-slate-900">{t("Overall Health")}</strong>

              <p className="mt-2 text-sm leading-6 text-slate-500">{t("Your latest health information is within the expected range.")}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{t("Information up to date")}</div>
            </div>
          </div>
        </div>

        {/* ===================================================
            PRESCRIPTIONS
            =================================================== */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-600">{t("Medication")}</div>

              <h2 className="text-xl font-extrabold text-slate-900">{t("Current Prescriptions")}</h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 text-xl shadow-lg shadow-violet-500/20">
              💊
            </div>
          </div>

          <div className="space-y-3">
            {prescriptions.length === 0 && (
              <EmptyState
                icon="💊"
                title={t("No active prescriptions")}
                message={t("Prescriptions from your doctors will appear here.")}
              />
            )}

            {prescriptions.map((prescription) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all duration-200 hover:border-violet-100 hover:bg-violet-50/40"
                key={prescription.key}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg">
                  💊
                </div>

                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold text-slate-900">
                    {prescription.medicine}
                  </strong>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {prescription.dosage}
                  </p>
                </div>

                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-bold text-violet-700">
                  {t(prescription.frequency)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <Link
              to="/patient/medical-records"
              className="group/link inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition-colors hover:text-indigo-600"
            >{t("View Medical Records")}<span className="transition-transform duration-200 group-hover/link:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* ===================================================
            MESSAGES
            =================================================== */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-600">{t("Communication")}</div>

              <h2 className="text-xl font-extrabold text-slate-900">{t("Messages")}</h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-xl shadow-lg shadow-cyan-500/20">
              💬
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-emerald-50 p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-2xl font-black text-white shadow-lg shadow-emerald-500/20">
              {unreadMessages}
            </div>

            <div>
              <strong className="block text-base font-extrabold text-slate-900">{t("Unread Messages")}</strong>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {unreadMessages > 0
                  ? unreadMessages === 1
                    ? t("You have 1 unread message from your care team.")
                    : t("You have {count} unread messages from your care team.", { count: unreadMessages })
                  : t("You are all caught up. No unread messages.")}
              </p>

              {unreadMessages > 0 && (
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />{t("Needs your attention")}</span>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <Link
              to="/patient/messages"
              className="group/link inline-flex items-center gap-2 text-sm font-bold text-cyan-600 transition-colors hover:text-teal-600"
            >{t("Open Messages")}<span className="transition-transform duration-200 group-hover/link:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================
          RECENT APPOINTMENTS
          ===================================================== */}

      <section>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">{t("History")}</div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("Recent Appointments")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Your latest appointment history.")}</p>
          </div>

          <Link
            to="/patient/appointments"
            className="group inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md"
          >{t("View All")}<span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title={t("No past appointments")}
            message={t("Completed appointments will be listed here.")}
          />
        ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t("Doctor")}</th>

                  <th className="px-6 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t("Department")}</th>

                  <th className="px-6 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t("Date")}</th>

                  <th className="px-6 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t("Status")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="group transition-colors hover:bg-emerald-50/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 text-xs font-extrabold text-white shadow-sm">
                          {appointment.doctor
                            .replace("Dr. ", "")
                            .split(" ")
                            .map((name) => name.charAt(0))
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <strong className="text-sm font-bold text-slate-800">
                          {appointment.doctor}
                        </strong>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {t(appointment.department)}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatAppointmentDate(appointment.date)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {t(appointment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </section>

      {/* =====================================================
          MEDICAL UPDATES
          ===================================================== */}

      <section>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-600">{t("Health Activity")}</div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("Recent Medical Updates")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Recent changes and updates to your medical information.")}</p>
          </div>

          <Link
            to="/patient/medical-records"
            className="group inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-bold text-cyan-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md"
          >{t("Medical Records")}<span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        <div className="space-y-3">
          {medicalUpdates.length === 0 && (
            <EmptyState
              icon="📋"
              title={t("No medical updates")}
              message={t("New diagnoses, prescriptions and notes will appear here.")}
            />
          )}

          {medicalUpdates.map((update) => (
            <div
              className="group flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-100 hover:shadow-lg hover:shadow-cyan-500/5"
              key={update.key}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-emerald-50 text-xl ring-1 ring-cyan-100 transition-transform duration-300 group-hover:scale-105">
                {update.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-extrabold text-slate-900">
                        {t(update.title)}
                      </strong>

                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                        {t(update.type)}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs font-medium text-slate-400">
                    {update.date}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {update.description}
                </p>

                <span className="mt-2 inline-block text-xs font-semibold text-slate-600">
                  {update.doctor}
                </span>
              </div>

              <span className="mt-2 hidden text-xl font-bold text-cyan-400 transition-transform duration-200 group-hover:translate-x-1 sm:block">
                →
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default PatientDashboard;