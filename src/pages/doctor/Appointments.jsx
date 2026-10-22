import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useAuth } from "../../context/useAuth";
import { useCurrentDoctorId } from "../../context/useCurrentProfile";
import { useToast } from "../../context/useToast";
import { logActivity } from "../../data/adminData";
import {
  getDoctorAppointments,
  isUpcoming,
  updateAppointment,
} from "../../data/appointmentData";
import { formatDate, formatShortDate, getTodayDate } from "../../utils/date";

import { lower, t } from "../../i18n";
function DoctorAppointments() {
  const [activeTab, setActiveTab] = useState("upcoming");

  const showToast = useToast();
  const { user } = useAuth();
  const doctorId = useCurrentDoctorId();

  const [appointments, setAppointments] = useState(() =>
    getDoctorAppointments(doctorId)
  );
  const [pendingAction, setPendingAction] = useState(null);

  const todayDate = getTodayDate();

  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === todayDate
  );

  const upcomingAppointments = appointments.filter(isUpcoming);

  const completedAppointments = appointments.filter(
    (appointment) => appointment.status === "Completed"
  );

  const cancelledAppointments = appointments.filter(
    (appointment) => appointment.status === "Cancelled"
  );

  const filteredAppointments = appointments.filter((appointment) => {
    if (activeTab === "today") {
      return appointment.date === todayDate;
    }

    if (activeTab === "upcoming") {
      return isUpcoming(appointment);
    }

    if (activeTab === "completed") {
      return appointment.status === "Completed";
    }

    if (activeTab === "cancelled") {
      return appointment.status === "Cancelled";
    }

    return false;
  });

  const ACTIONS = {
    confirm: {
      status: "Confirmed",
      title: t("Confirm appointment?"),
      verb: "Confirmed",
      button: t("Confirm"),
      variant: "success",
    },
    complete: {
      status: "Completed",
      title: t("Mark appointment as completed?"),
      verb: "Completed",
      button: t("Mark Completed"),
      variant: "primary",
    },
    cancel: {
      status: "Cancelled",
      title: t("Cancel appointment?"),
      verb: "Cancelled",
      button: t("Cancel Appointment"),
      variant: "danger",
    },
  };

  const runAction = () => {
    const { appointment, type } = pendingAction;
    const action = ACTIONS[type];

    updateAppointment(appointment.id, { status: action.status });
    setAppointments(getDoctorAppointments(doctorId));
    logActivity(
      user,
      `${action.verb} appointment with ${appointment.patient}`,
      "Appointments",
      type === "cancel" ? "Warning" : "Success"
    );
    showToast(
      t("Appointment with {patient} {verb}.", {
        patient: appointment.patient,
        verb: lower(t(action.verb)),
      })
    );
    setPendingAction(null);
  };

  const getStatusStyles = (status) => {
    if (status === "Confirmed") {
      return {
        container: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };
    }

    if (status === "Pending") {
      return {
        container: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    }

    if (status === "Completed") {
      return {
        container: "border-blue-200 bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
      };
    }

    if (status === "Cancelled") {
      return {
        container: "border-rose-200 bg-rose-50 text-rose-700",
        dot: "bg-rose-500",
      };
    }

    return {
      container: "border-slate-200 bg-slate-50 text-slate-600",
      dot: "bg-slate-400",
    };
  };

  const getEmptyStateContent = () => {
    if (activeTab === "today") {
      return {
        title: t("No Appointments Today"),
        message:
          t("There are no appointments scheduled for today ({date}).", {
            date: formatDate(todayDate),
          }),
        icon: "📅",
      };
    }

    if (activeTab === "upcoming") {
      return {
        title: t("No Upcoming Appointments"),
        message:
          t("There are currently no confirmed or pending appointments."),
        icon: "📅",
      };
    }

    if (activeTab === "completed") {
      return {
        title: t("No Completed Appointments"),
        message:
          t("There are currently no completed appointments in your records."),
        icon: "✓",
      };
    }

    if (activeTab === "cancelled") {
      return {
        title: t("No Cancelled Appointments"),
        message:
          t("There are currently no cancelled appointments in your records."),
        icon: "✕",
      };
    }

    return {
      title: t("No Appointments"),
      message: t("There are no appointments in this section."),
      icon: "📋",
    };
  };

  const emptyStateContent = getEmptyStateContent();

  const tabs = [
    {
      id: "today",
      label: t("Today"),
      count: todayAppointments.length,
      icon: "📅",
    },
    {
      id: "upcoming",
      label: t("Upcoming"),
      count: upcomingAppointments.length,
      icon: "🗓️",
    },
    {
      id: "completed",
      label: t("Completed"),
      count: completedAppointments.length,
      icon: "✓",
    },
    {
      id: "cancelled",
      label: t("Cancelled"),
      count: cancelledAppointments.length,
      icon: "✕",
    },
  ];

  const summaryCards = [
    {
      id: "today",
      label: t("Today's Appointments"),
      value: todayAppointments.length,
      icon: "📅",
      background: "from-indigo-50 to-violet-50",
      iconBackground: "bg-indigo-100",
      iconText: "text-indigo-600",
    },
    {
      id: "upcoming",
      label: t("Upcoming"),
      value: upcomingAppointments.length,
      icon: "🗓️",
      background: "from-violet-50 to-purple-50",
      iconBackground: "bg-violet-100",
      iconText: "text-violet-600",
    },
    {
      id: "completed",
      label: t("Completed"),
      value: completedAppointments.length,
      icon: "✓",
      background: "from-emerald-50 to-teal-50",
      iconBackground: "bg-emerald-100",
      iconText: "text-emerald-600",
    },
    {
      id: "cancelled",
      label: t("Cancelled"),
      value: cancelledAppointments.length,
      icon: "✕",
      background: "from-rose-50 to-pink-50",
      iconBackground: "bg-rose-100",
      iconText: "text-rose-600",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 p-6 text-white shadow-2xl shadow-indigo-500/20 sm:p-8">

        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute -bottom-28 right-32 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur-md">

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />{t("DOCTOR WORKSPACE")}</div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("Appointments")}</h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">{t("View and manage your scheduled patient appointments.")}</p>

          </div>

          <Link
            to="/doctor/availability"
            className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-xl"
          >
            <span className="text-lg">🕒</span>{t("Manage Availability")}<span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>

        </div>

      </section>


      {/* =====================================================
          CLICKABLE APPOINTMENT SUMMARY
          ===================================================== */}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {summaryCards.map((card) => {

          const isActive = activeTab === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveTab(card.id)}
              className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isActive
                  ? "border-indigo-400 ring-2 ring-indigo-500/20 shadow-lg"
                  : "border-slate-200"
              } ${card.background}`}
            >

              {/* Active indicator */}

              <div
                className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-violet-600 transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/50 transition-transform duration-500 group-hover:scale-125" />

              <div className="relative flex items-center justify-between">

                <div>

                  <span className="block text-sm font-semibold text-slate-500">
                    {t(card.label)}
                  </span>

                  <strong className="mt-2 block text-4xl font-black tracking-tight text-slate-900">
                    {card.value}
                  </strong>

                  <span
                    className={`mt-2 inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                      isActive
                        ? "text-indigo-600"
                        : "text-slate-400 group-hover:text-indigo-500"
                    }`}
                  >
                    {isActive ? t("Currently viewing") : t("Click to filter")}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>

                </div>

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBackground} ${card.iconText} text-xl shadow-sm transition-transform duration-300 group-hover:scale-110`}
                >
                  {card.icon}
                </div>

              </div>

            </button>
          );
        })}

      </section>


      {/* =====================================================
          APPOINTMENTS
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* ===================================================
            TABS
            =================================================== */}

        <div className="border-b border-slate-100 px-4 pt-4 sm:px-6">

          <div className="flex overflow-x-auto">

            {tabs.map((tab) => {

              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex min-w-fit items-center gap-2 px-4 py-4 text-sm font-bold transition-all duration-200 sm:px-6 ${
                    isActive
                      ? "text-indigo-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >

                  <span
                    className={`transition-transform duration-200 ${
                      isActive ? "scale-110" : "grayscale"
                    }`}
                  >
                    {tab.icon}
                  </span>

                  {t(tab.label)}

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
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
            STATUS VIEW DESCRIPTION
            =================================================== */}

        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">

          {activeTab === "today" && (
            <div className="flex gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                📅
              </div>

              <div>

                <strong className="block text-sm font-bold text-slate-900">{t("Today's Appointments")}</strong>

                <span className="mt-1 block text-sm text-slate-500">{t("Appointments scheduled for {todayDate}.", { todayDate })}</span>

              </div>

            </div>
          )}

          {activeTab === "upcoming" && (
            <div className="flex gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                🗓️
              </div>

              <div>

                <strong className="block text-sm font-bold text-slate-900">{t("Upcoming Appointments")}</strong>

                <span className="mt-1 block text-sm text-slate-500">{t("Confirmed and pending appointments that are scheduled for patients.")}</span>

              </div>

            </div>
          )}

          {activeTab === "completed" && (
            <div className="flex gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-600">
                ✓
              </div>

              <div>

                <strong className="block text-sm font-bold text-slate-900">{t("Completed Appointments")}</strong>

                <span className="mt-1 block text-sm text-slate-500">{t("Appointments that have already been completed.")}</span>

              </div>

            </div>
          )}

          {activeTab === "cancelled" && (
            <div className="flex gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 font-bold text-rose-600">
                ✕
              </div>

              <div>

                <strong className="block text-sm font-bold text-slate-900">{t("Cancelled Appointments")}</strong>

                <span className="mt-1 block text-sm text-slate-500">{t("Appointments that were cancelled and are no longer scheduled.")}</span>

              </div>

            </div>
          )}

        </div>


        {/* ===================================================
            TABLE
            =================================================== */}

        <div className="overflow-x-auto">

          {filteredAppointments.length === 0 ? (

            <div className="px-6 py-16 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                {emptyStateContent.icon}
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-900">
                {t(emptyStateContent.title)}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {emptyStateContent.message}
              </p>

            </div>

          ) : (

            <table className="min-w-[1050px] w-full">

              <thead>

                <tr className="border-b border-slate-100 bg-slate-50/70">

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Date")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Time")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Patient")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Reason")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Symptoms")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Status")}</th>

                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t("Action")}</th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {filteredAppointments.map((appointment) => {

                  const statusStyles = getStatusStyles(
                    appointment.status
                  );

                  return (
                    <tr
                      key={appointment.id}
                      className="group transition-colors hover:bg-indigo-50/30"
                    >

                      <td className="px-6 py-5">

                        <span className="text-sm font-semibold text-slate-700">
                          {formatShortDate(appointment.date)}
                        </span>

                      </td>


                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />

                          <span className="text-sm font-bold text-slate-800">
                            {t(appointment.time)}
                          </span>

                        </div>

                      </td>


                      <td className="px-6 py-5">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-md">
                            {appointment.patient.charAt(0)}
                          </div>

                          <strong className="text-sm font-bold text-slate-800">
                            {appointment.patient}
                          </strong>

                        </div>

                      </td>


                      <td className="px-6 py-5">

                        <span className="text-sm font-medium text-slate-600">
                          {appointment.reason}
                        </span>

                      </td>


                      <td className="max-w-xs px-6 py-5">

                        <span className="text-sm text-slate-500">
                          {appointment.symptoms}
                        </span>

                      </td>


                      <td className="px-6 py-5">

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyles.container}`}
                        >

                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                          />

                          {t(appointment.status)}

                        </span>

                      </td>


                      <td className="px-6 py-5">

                        <div className="flex flex-wrap items-center gap-2">

                        {appointment.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({ appointment, type: "confirm" })
                            }
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
                          >{t("Confirm")}</button>
                        )}

                        {appointment.status === "Confirmed" &&
                          appointment.date <= todayDate && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({ appointment, type: "complete" })
                              }
                              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
                            >{t("Complete")}</button>
                          )}

                        {isUpcoming(appointment) && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({ appointment, type: "cancel" })
                            }
                            className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition-all hover:bg-rose-50"
                          >{t("Cancel")}</button>
                        )}

                        <Link
                          to={`/doctor/patients/${appointment.patientId}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md"
                        >{t("View Patient")}<span className="transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </Link>

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          )}

        </div>

      </section>

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        title={pendingAction ? ACTIONS[pendingAction.type].title : ""}
        message={
          pendingAction
            ? t("{patient} · {date} at {time}", {
                patient: pendingAction.appointment.patient,
                date: formatDate(pendingAction.appointment.date),
                time: pendingAction.appointment.time,
              })
            : ""
        }
        confirmText={pendingAction ? ACTIONS[pendingAction.type].button : t("Confirm")}
        cancelText={t("Back")}
        variant={pendingAction ? ACTIONS[pendingAction.type].variant : "primary"}
        onConfirm={runAction}
        onCancel={() => setPendingAction(null)}
      />

    </div>
  );
}

export default DoctorAppointments;