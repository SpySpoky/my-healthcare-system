import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/useToast";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import Button from "../../components/forms/Button";
import { useAuth } from "../../context/useAuth";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { logActivity } from "../../data/adminData";
import {
  formatAppointmentDateLong,
  getPatientAppointments,
  isUpcoming,
  updateAppointment,
} from "../../data/appointmentData";

import { t } from "../../i18n";
function Appointments() {
  const navigate = useNavigate();
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState("upcoming");

  const [isCancelOpen, setIsCancelOpen] =
    useState(false);

  const [isDetailsOpen, setIsDetailsOpen] =
    useState(false);

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const { user } = useAuth();
  const patientId = useCurrentPatientId();

  const [appointments, setAppointments] = useState(() =>
    getPatientAppointments(patientId)
  );

  const upcomingAppointments = appointments.filter(isUpcoming);

  // Completed visits, newest first.
  const pastAppointments = appointments
    .filter((appointment) => appointment.status === "Completed")
    .reverse();

  const cancelledAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "Cancelled"
  );

  const closeCancelDialog = () => {
    setIsCancelOpen(false);
    setSelectedAppointment(null);
  };

  useEscapeKey(isCancelOpen, closeCancelDialog);

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsOpen(true);
  };

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    navigate(
      `/patient/appointments/${appointment.id}/reschedule`
    );
  };

  const handleCancel = (appointment) => {
    setSelectedAppointment(appointment);
    setIsCancelOpen(true);
  };

  const confirmCancel = () => {
    if (!selectedAppointment) {
      return;
    }

    updateAppointment(selectedAppointment.id, { status: "Cancelled" });
    setAppointments(getPatientAppointments(patientId));
    logActivity(
      user,
      `Cancelled an appointment with ${selectedAppointment.doctor}`,
      "Appointments",
      "Warning"
    );

    setIsCancelOpen(false);

    setSelectedAppointment(null);

    setActiveTab("cancelled");

    showToast(t("Appointment cancelled successfully."));
  };

  const getBadgeVariant = (status) => {
    switch (status) {
      case "Confirmed":
        return "success";

      case "Pending":
        return "warning";

      case "Completed":
        return "success";

      case "Cancelled":
        return "danger";

      default:
        return "secondary";
    }
  };

  const getDoctorInitials = (doctor) => {
    return doctor
      .replace("Dr. ", "")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2);
  };

  const getActiveAppointments = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingAppointments;

      case "past":
        return pastAppointments;

      case "cancelled":
        return cancelledAppointments;

      default:
        return upcomingAppointments;
    }
  };

  const activeAppointments =
    getActiveAppointments();

  const getTabTitle = () => {
    switch (activeTab) {
      case "upcoming":
        return t("Upcoming Appointments");

      case "past":
        return t("Past Appointments");

      case "cancelled":
        return t("Cancelled Appointments");

      default:
        return t("Appointments");
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case "upcoming":
        return t("Your scheduled upcoming appointments.");

      case "past":
        return t("Your previously completed appointments.");

      case "cancelled":
        return t("Appointments that have been cancelled.");

      default:
        return "";
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* Page Header */}

      <div className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 p-6 text-white shadow-xl shadow-cyan-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-8">

        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("My Appointments")}</h1>

          <p className="mt-2 max-w-xl text-sm text-cyan-50 sm:text-base">{t("View and manage your healthcare appointments.")}</p>
        </div>

        <Button
          onClick={() =>
            navigate("/patient/appointments/book")
          }
        >{t("+ Book Appointment")}</Button>

      </div>


      {/* Appointment Views */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* Upcoming */}

        <button
          type="button"
          className={`group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg ${
            activeTab === "upcoming"
              ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-emerald-50 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-100"
              : ""
          }`}
          onClick={() =>
            setActiveTab("upcoming")
          }
          aria-pressed={activeTab === "upcoming"}
        >

          <span className="block text-sm font-semibold uppercase tracking-wider text-slate-500">{t("Upcoming")}</span>

          <strong className="mt-2 block text-3xl font-black text-slate-900">
            {upcomingAppointments.length}
          </strong>

          <span className="mt-1 block text-sm text-slate-500">{t("Scheduled appointments")}</span>

        </button>


        {/* Past */}

        <button
          type="button"
          className={`group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg ${
            activeTab === "past"
              ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-emerald-50 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-100"
              : ""
          }`}
          onClick={() =>
            setActiveTab("past")
          }
          aria-pressed={activeTab === "past"}
        >

          <span className="block text-sm font-semibold uppercase tracking-wider text-slate-500">{t("Past")}</span>

          <strong className="mt-2 block text-3xl font-black text-slate-900">
            {pastAppointments.length}
          </strong>

          <span className="mt-1 block text-sm text-slate-500">{t("Completed appointments")}</span>

        </button>


        {/* Cancelled */}

        <button
          type="button"
          className={`group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg ${
            activeTab === "cancelled"
              ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-emerald-50 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-100"
              : ""
          }`}
          onClick={() =>
            setActiveTab("cancelled")
          }
          aria-pressed={activeTab === "cancelled"}
        >

          <span className="block text-sm font-semibold uppercase tracking-wider text-slate-500">{t("Cancelled")}</span>

          <strong className="mt-2 block text-3xl font-black text-slate-900">
            {cancelledAppointments.length}
          </strong>

          <span className="mt-1 block text-sm text-slate-500">{t("Cancelled appointments")}</span>

        </button>

      </div>


      {/* Active Appointment View */}

      <section className="space-y-5">

        <div className="flex items-center justify-between gap-4">

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {getTabTitle()}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {getTabDescription()}
            </p>
          </div>

        </div>


        {activeAppointments.length === 0 ? (

          <Card>

            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-emerald-100 text-3xl shadow-inner">
                📅
              </div>

              <h3 className="text-xl font-bold text-slate-900">{t("No {activeTab} appointments", { activeTab })}</h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">

                {activeTab === "upcoming" &&
                  t("You currently have no upcoming appointments.")}

                {activeTab === "past" &&
                  t("You do not have any completed appointments.")}

                {activeTab === "cancelled" &&
                  t("You do not have any cancelled appointments.")}

              </p>

              {activeTab === "upcoming" && (
                <Button
                  onClick={() =>
                    navigate(
                      "/patient/appointments/book"
                    )
                  }
                >{t("Book an Appointment")}</Button>
              )}

            </div>

          </Card>

        ) : (

          <div className="space-y-4">

            {activeAppointments.map(
              (appointment) => (

                <Card
                  key={appointment.id}
                  as="article"
                  aria-label={`${appointment.doctor}, ${appointment.reason}`}
                >

                  <div className="space-y-5">

                    {/* Doctor */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-sm font-bold text-white shadow-md shadow-cyan-500/20">
                          {getDoctorInitials(
                            appointment.doctor
                          )}
                        </div>

                        <div>

                          <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                            {appointment.doctor}
                          </h3>

                          <p className="mt-0.5 text-sm text-slate-500">
                            {t(appointment.department)}
                          </p>

                        </div>

                      </div>


                      <Badge
                        variant={getBadgeVariant(
                          appointment.status
                        )}
                      >
                        {t(appointment.status)}
                      </Badge>

                    </div>


                    {/* Appointment Information */}

                    <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">

                      <div>

                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date")}</span>

                        <strong className="mt-1 block text-sm font-semibold text-slate-800">
                          {formatAppointmentDateLong(appointment.date)}
                        </strong>

                      </div>

                      <div>

                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Time")}</span>

                        <strong className="mt-1 block text-sm font-semibold text-slate-800">
                          {t(appointment.time)}
                        </strong>

                      </div>

                      <div>

                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Reason")}</span>

                        <strong className="mt-1 block text-sm font-semibold text-slate-800">
                          {appointment.reason}
                        </strong>

                      </div>

                    </div>


                    {/* Actions */}

                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

                      <Button
                        variant="secondary"
                        onClick={() =>
                          handleViewDetails(
                            appointment
                          )
                        }
                      >{t("View Details")}</Button>


                      {activeTab === "upcoming" && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleReschedule(
                                appointment
                              )
                            }
                          >{t("Reschedule")}</Button>

                          <Button
                            variant="danger"
                            onClick={() =>
                              handleCancel(
                                appointment
                              )
                            }
                          >{t("Cancel")}</Button>
                        </>
                      )}

                    </div>

                  </div>

                </Card>
              )
            )}

          </div>

        )}

      </section>


      {/* Appointment Details Modal */}

      <Modal
        title={t("Appointment Details")}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedAppointment(null);
        }}
      >

        {selectedAppointment && (

          <div className="space-y-6">

            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-emerald-50 p-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-sm font-bold text-white shadow-md shadow-cyan-500/20">
                {getDoctorInitials(
                  selectedAppointment.doctor
                )}
              </div>

              <div>

                <h3 className="text-lg font-bold text-slate-900">
                  {selectedAppointment.doctor}
                </h3>

                <p className="text-sm text-slate-500">
                  {t(selectedAppointment.department)}
                </p>

              </div>

            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {formatAppointmentDateLong(selectedAppointment.date)}
                </strong>

              </div>


              <div>

                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Time")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {t(selectedAppointment.time)}
                </strong>

              </div>


              <div>

                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Reason")}</span>

                <strong className="mt-1 block text-sm font-semibold text-slate-800">
                  {selectedAppointment.reason}
                </strong>

              </div>


              <div>

                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Status")}</span>

                <Badge
                  variant={getBadgeVariant(
                    selectedAppointment.status
                  )}
                >
                  {t(selectedAppointment.status)}
                </Badge>

              </div>

            </div>


            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsOpen(false);
                  setSelectedAppointment(null);
                }}
              >{t("Close")}</Button>

            </div>

          </div>

        )}

      </Modal>




      {/* =====================================================
          W38 - CANCEL APPOINTMENT CONFIRMATION
          ===================================================== */}

      {isCancelOpen && selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => {
            setIsCancelOpen(false);
            setSelectedAppointment(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Cancel appointment")}
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Header */}

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl font-black text-red-600">
                !
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">{t("Cancel Appointment?")}</h2>

                <p className="mt-1 text-sm text-slate-500">{t("Are you sure you want to cancel this appointment?")}</p>
              </div>

            </div>


            {/* Appointment Information */}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-sm font-bold text-white shadow-md">
                  {getDoctorInitials(
                    selectedAppointment.doctor
                  )}
                </div>

                <div>

                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Doctor")}</span>

                  <strong className="mt-1 block text-sm font-bold text-slate-900">
                    {selectedAppointment.doctor}
                  </strong>

                  <small className="mt-0.5 block text-xs text-slate-500">
                    {t(selectedAppointment.department)}
                  </small>

                </div>

              </div>


              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">

                <div>

                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Date")}</span>

                  <strong className="mt-1 block text-sm font-semibold text-slate-800">
                    {formatAppointmentDateLong(selectedAppointment.date)}
                  </strong>

                </div>


                <div>

                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Time")}</span>

                  <strong className="mt-1 block text-sm font-semibold text-slate-800">
                    {t(selectedAppointment.time)}
                  </strong>

                </div>


                <div>

                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Appointment Type")}</span>

                  <strong className="mt-1 block text-sm font-semibold text-slate-800">
                    {selectedAppointment.reason}
                  </strong>

                </div>


                <div>

                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Status")}</span>

                  <strong className="mt-1 block text-sm font-semibold text-slate-800">
                    {t(selectedAppointment.status)}
                  </strong>

                </div>

              </div>

            </div>


            {/* Warning */}

            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">
                !
              </div>

              <div>

                <strong className="block text-sm font-bold">{t("Cancellation Notice")}</strong>

                <p className="mt-1 text-sm leading-6 text-amber-800">{t("Cancelling this appointment will remove it from your upcoming appointments. You can view it later under your cancelled appointments.")}</p>

              </div>

            </div>


            {/* Actions */}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsCancelOpen(false);
                  setSelectedAppointment(null);
                }}
              >{t("Keep Appointment")}</Button>

              <Button
                type="button"
                variant="danger"
                onClick={confirmCancel}
              >{t("Cancel Appointment")}</Button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Appointments;