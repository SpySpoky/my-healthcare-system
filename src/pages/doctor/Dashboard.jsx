import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useCurrentDoctorId } from "../../context/useCurrentProfile";
import { loadActivity, loadFeedback } from "../../data/adminData";
import { getDoctorAppointments, isUpcoming } from "../../data/appointmentData";
import { loadPatients } from "../../data/patientsData";
import { getTodayDate, parseDate } from "../../utils/date";

import { translateActivity } from "../../i18n/activity";
import { getLocale, t } from "../../i18n";
const timeAgo = (timestamp) => {
  const minutes = Math.round((Date.now() - new Date(timestamp)) / 60000);

  if (minutes < 60) {
    return t("{count} minutes ago", { count: Math.max(minutes, 1) });
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? t("1 hour ago") : t("{count} hours ago", { count: hours });
  }

  const days = Math.round(hours / 24);

  return days === 1 ? t("Yesterday") : t("{count} days ago", { count: days });
};

// Dashboard data for the signed-in doctor (or the whole clinic for
// medical staff).
const buildDashboard = (doctorId, doctorName) => {
  const today = getTodayDate();
  const appointments = getDoctorAppointments(doctorId);
  const patientsByName = new Map(
    loadPatients().map((patient) => [patient.name, patient.id])
  );

  const todaySchedule = appointments.filter(
    (appointment) =>
      appointment.date === today && appointment.status !== "Cancelled"
  );

  const upcomingAppointments = appointments
    .filter((appointment) => appointment.date > today && isUpcoming(appointment))
    .slice(0, 3)
    .map((appointment) => {
      const date = parseDate(appointment.date);

      return {
        ...appointment,
        monthLabel: date.toLocaleDateString(getLocale(), { month: "short" }),
        dayLabel: date.getDate(),
      };
    });

  const recentActivities = loadActivity()
    .filter(
      (entry) => entry.role === "patient" && patientsByName.has(entry.user)
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      patientId: patientsByName.get(entry.user),
      patient: entry.user,
      activity: translateActivity(entry.action),
      time: timeAgo(entry.timestamp),
    }));

  const ratings = loadFeedback()
    .filter((item) => !doctorName || item.doctor === doctorName)
    .map((item) => item.rating);

  return {
    todaySchedule,
    upcomingAppointments,
    recentActivities,
    patientCount: new Set(appointments.map((item) => item.patientId)).size,
    pendingCount: appointments.filter(
      (appointment) => appointment.status === "Pending" && isUpcoming(appointment)
    ).length,
    averageRating: ratings.length
      ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
      : "—",
    ratingCount: ratings.length,
  };
};

function DoctorDashboard() {
  const { user } = useAuth();
  const doctorId = useCurrentDoctorId();

  const [dashboard] = useState(() =>
    buildDashboard(doctorId, doctorId ? user?.name : null)
  );

  const {
    todaySchedule,
    upcomingAppointments,
    recentActivities,
  } = dashboard;

  const summaryCards = [
    {
      title: t("Today's Appointments"),
      value: todaySchedule.length,
      description: t("Scheduled for today"),
      trend: t("Today"),
      icon: "📅",
      iconBackground: "bg-indigo-100",
      iconText: "text-indigo-600",
      background:
        "from-indigo-50 via-white to-violet-50",
      trendBackground:
        "bg-indigo-100 text-indigo-700",
    },
    {
      title: t("Total Patients"),
      value: dashboard.patientCount,
      description: doctorId ? t("Patients you have seen or will see") : t("Patients with appointments"),
      trend: t("Active"),
      icon: "👥",
      iconBackground: "bg-violet-100",
      iconText: "text-violet-600",
      background:
        "from-violet-50 via-white to-purple-50",
      trendBackground:
        "bg-emerald-100 text-emerald-700",
    },
    {
      title: t("Patient Reviews"),
      value: dashboard.averageRating,
      description:
        dashboard.ratingCount === 1
          ? t("From 1 patient review")
          : t("From {count} patient reviews", { count: dashboard.ratingCount }),
      trend: t("Rating"),
      icon: "⭐",
      iconBackground: "bg-amber-100",
      iconText: "text-amber-600",
      background:
        "from-amber-50 via-white to-orange-50",
      trendBackground:
        "bg-amber-100 text-amber-700",
    },
    {
      title: t("Pending Confirmations"),
      value: dashboard.pendingCount,
      description: t("Requests awaiting confirmation"),
      trend: t("Action"),
      icon: "⏳",
      iconBackground: "bg-blue-100",
      iconText: "text-blue-600",
      background:
        "from-blue-50 via-white to-indigo-50",
      trendBackground:
        "bg-blue-100 text-blue-700",
    },
  ];

  const quickActions = [
    {
      title: t("View Appointments"),
      description: t("Manage your schedule"),
      icon: "📅",
      to: "/doctor/appointments",
      background:
        "from-indigo-500 to-violet-600",
    },
    {
      title: t("Manage Availability"),
      description: t("Set your working hours"),
      icon: "🕒",
      to: "/doctor/availability",
      background:
        "from-violet-500 to-purple-600",
    },
    {
      title: t("View Patients"),
      description: t("Browse patient records"),
      icon: "👥",
      to: "/doctor/patients",
      background:
        "from-blue-500 to-indigo-600",
    },
    {
      title: t("Add Diagnosis"),
      description: t("Choose a patient to diagnose"),
      icon: "🩺",
      to: "/doctor/patients",
      background:
        "from-fuchsia-500 to-violet-600",
    },
    {
      title: t("Prescribe Medication"),
      description: t("Choose a patient to prescribe for"),
      icon: "💊",
      to: "/doctor/patients",
      background:
        "from-purple-500 to-indigo-600",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          PAGE HEADER / HERO
          ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 p-6 text-white shadow-2xl shadow-indigo-500/20 sm:p-8 lg:p-10">

        {/* Decorative background */}

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute -bottom-32 right-20 h-80 w-80 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/5" />

        <div className="relative flex min-h-[220px] items-center justify-between gap-8">

          <div className="max-w-2xl">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-md">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />{t("Doctor Workspace")}</div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{t("Doctor Dashboard")}</h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-indigo-100 sm:text-base">{user?.name
              ? t("Welcome back, {name}. Here is your schedule and patient activity.", { name: user.name })
              : t("Welcome back. Here is your schedule and patient activity.")}
            </p>

          </div>


          {/* Hero Decoration */}

          <div className="relative hidden h-48 w-48 shrink-0 items-center justify-center lg:flex">

            <div className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-white/10" />

            <div className="absolute inset-6 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-white/10 border-dashed" />

            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-5xl shadow-2xl backdrop-blur-md">
              ✚
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {summaryCards.map((card) => (

          <div
            key={card.title}
            className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${card.background} p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
          >

            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/60 transition-transform duration-500 group-hover:scale-125" />

            <div className="relative">

              <div className="flex items-start justify-between">

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBackground} ${card.iconText} text-xl shadow-sm`}
                >
                  {card.icon}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${card.trendBackground}`}
                >
                  {card.trend}
                </span>

              </div>


              <div className="mt-6">

                <span className="block text-sm font-semibold text-slate-500">
                  {t(card.title)}
                </span>

                <strong className="mt-1 block text-4xl font-black tracking-tight text-slate-900">
                  {card.value}
                </strong>

                <span className="mt-1 block text-xs font-medium text-slate-400">
                  {card.description}
                </span>

              </div>

            </div>

          </div>

        ))}

      </section>


      {/* =====================================================
          QUICK ACTIONS
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

          <div className="text-xs font-black tracking-[0.2em] text-violet-600">{t("SHORTCUTS")}</div>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Quick Actions")}</h2>

          <p className="mt-1 text-sm text-slate-500">{t("Access frequently used doctor functions.")}</p>

        </div>


        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

          {quickActions.map((action) => (

            <Link
              key={action.title}
              to={action.to}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-xl"
            >

              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${action.background}`}
              />

              <div className="flex items-start justify-between gap-3">

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.background} text-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  {action.icon}
                </div>

                <span className="text-lg font-bold text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-violet-500">
                  →
                </span>

              </div>


              <div className="mt-5">

                <strong className="block text-sm font-bold text-slate-900">
                  {t(action.title)}
                </strong>

                <small className="mt-1 block text-xs leading-5 text-slate-500">
                  {action.description}
                </small>

              </div>

            </Link>

          ))}

        </div>

      </section>


      {/* =====================================================
          TODAY'S SCHEDULE
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">

          <div>

            <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("TODAY")}</div>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Today's Schedule")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("{length} appointments scheduled for today.", { length: todaySchedule.length })}</p>

          </div>


          <Link
            to="/doctor/appointments"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
          >{t("View All")}<span>→</span>
          </Link>

        </div>


        <div className="overflow-x-auto">

          <table className="min-w-[850px] w-full">

            <thead>

              <tr className="border-b border-slate-100 bg-slate-50/70">

                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Time")}</th>

                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Patient")}</th>

                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Reason")}</th>

                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Symptoms")}</th>

                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Status")}</th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {todaySchedule.length > 0 ? (

                todaySchedule.map((appointment) => (

                  <tr
                    key={appointment.id}
                    className="group transition-colors hover:bg-indigo-50/40"
                  >

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/30" />

                        <strong className="text-sm font-bold text-slate-800">
                          {t(appointment.time)}
                        </strong>

                      </div>

                    </td>


                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-md">
                          {appointment.patient.charAt(0)}
                        </div>

                        <Link
                          to={`/doctor/patients/${appointment.patientId}`}
                          className="text-sm font-bold text-slate-800 transition-colors hover:text-indigo-700"
                        >
                          {appointment.patient}
                        </Link>

                      </div>

                    </td>


                    <td className="px-6 py-5 text-sm font-medium text-slate-600">
                      {appointment.reason}
                    </td>


                    <td className="max-w-xs px-6 py-5 text-sm text-slate-500">
                      {appointment.symptoms}
                    </td>


                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                          appointment.status === "Confirmed"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            appointment.status === "Confirmed"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />

                        {t(appointment.status)}
                      </span>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td colSpan="5" className="px-6 py-14">

                    <div className="text-center">

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                        📅
                      </div>

                      <h3 className="mt-4 text-lg font-bold text-slate-900">{t("No appointments today")}</h3>

                      <p className="mt-1 text-sm text-slate-500">{t("There are no appointments scheduled for today.")}</p>

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* =====================================================
          RECENT ACTIVITIES AND UPCOMING APPOINTMENTS
          ===================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ===================================================
            RECENT PATIENT ACTIVITIES
            =================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="text-xs font-black tracking-[0.2em] text-violet-600">{t("PATIENTS")}</div>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Recent Patient Activities")}</h2>

              <p className="mt-1 text-sm text-slate-500">{t("Recent updates from monitored patients.")}</p>

            </div>

            <Link
              to="/doctor/patients"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md"
            >{t("View Patients")}<span>→</span>
            </Link>

          </div>


          <div className="divide-y divide-slate-100">

            {recentActivities.length > 0 ? (

              recentActivities.map((activity) => (

                <div
                  className="group flex gap-4 p-5 transition-colors hover:bg-violet-50/30"
                  key={activity.id}
                >

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-md">
                    {activity.patient.charAt(0)}
                  </div>


                  <div className="min-w-0 flex-1">

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                      <strong className="text-sm font-bold text-slate-900">
                        {activity.patient}
                      </strong>

                      <span className="text-xs font-medium text-slate-400">
                        {t(activity.time)}
                      </span>

                    </div>

                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      {activity.activity}
                    </span>

                    <Link
                      to={`/doctor/patients/${activity.patientId}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-600 transition-colors hover:text-violet-800"
                    >{t("View Patient")}<span className="transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Link>

                  </div>

                </div>

              ))

            ) : (

              <div className="px-6 py-14 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  👥
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">{t("No recent patient activity")}</h3>

                <p className="mt-1 text-sm text-slate-500">{t("There are currently no recent patient activities.")}</p>

              </div>

            )}

          </div>

        </section>


        {/* ===================================================
            UPCOMING APPOINTMENTS
            =================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("NEXT")}</div>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Upcoming Appointments")}</h2>

              <p className="mt-1 text-sm text-slate-500">{t("{length} upcoming appointments.", { length: upcomingAppointments.length })}</p>

            </div>

            <Link
              to="/doctor/appointments"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
            >{t("View All")}<span>→</span>
            </Link>

          </div>


          <div className="divide-y divide-slate-100">

            {upcomingAppointments.length > 0 ? (

              upcomingAppointments.map((appointment) => (

                <div
                  className="group flex gap-4 p-5 transition-colors hover:bg-indigo-50/30"
                  key={appointment.id}
                >

                  {/* Date */}

                  <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 p-3 text-center">

                    <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
                      {appointment.monthLabel}
                    </span>

                    <strong className="text-2xl font-black text-indigo-700">
                      {appointment.dayLabel}
                    </strong>

                    <span className="mt-1 text-[11px] font-bold text-violet-500">
                      {t(appointment.time)}
                    </span>

                  </div>


                  {/* Details */}

                  <div className="min-w-0 flex-1">

                    <strong className="block text-sm font-bold text-slate-900">
                      {appointment.patient}
                    </strong>

                    <span className="mt-1 block text-sm text-slate-500">
                      {appointment.reason}
                    </span>

                    <span className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {t(appointment.status)}
                    </span>

                    <Link
                      to={`/doctor/patients/${appointment.patientId}`}
                      className="mt-3 flex w-fit items-center gap-1 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800"
                    >{t("View Patient")}<span className="transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Link>

                  </div>

                </div>

              ))

            ) : (

              <div className="px-6 py-14 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  📅
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">{t("No upcoming appointments")}</h3>

                <p className="mt-1 text-sm text-slate-500">{t("There are currently no upcoming appointments.")}</p>

              </div>

            )}

          </div>

        </section>

      </div>

    </div>
  );
}

export default DoctorDashboard;