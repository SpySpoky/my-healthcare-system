import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormSection from "../../components/appointments/FormSection";
import ProgressSteps from "../../components/appointments/ProgressSteps";
import TimeSlotPicker from "../../components/appointments/TimeSlotPicker";
import Avatar from "../../components/common/Avatar";
import DetailRow from "../../components/common/DetailRow";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import Button from "../../components/forms/Button";
import FieldMessage from "../../components/forms/FieldMessage";
import Input from "../../components/forms/Input";
import PageHeader from "../../components/layout/PageHeader";
import { useToast } from "../../context/useToast";
import { useAuth } from "../../context/useAuth";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { logActivity } from "../../data/adminData";
import {
  TIME_SLOTS,
  formatAppointmentDateLong,
  getBookedTimes,
  getPatientAppointments,
  isUpcoming,
  updateAppointment,
} from "../../data/appointmentData";
import { getDoctorTimesForDate } from "../../data/doctorsData";
import { getTodayDate, timeToMinutes } from "../../utils/date";

import { lower, t } from "../../i18n";
const STEPS = ["Appointment", "New Date & Time", "Confirmation"];

// Times the doctor works on that date that are free (ignoring the
// appointment being moved) and, for today, not already past.
const getOpenTimes = (appointment, dateKey) => {
  if (!dateKey) {
    return [];
  }

  const booked = getBookedTimes(appointment.doctorId, dateKey, appointment.id);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return getDoctorTimesForDate(appointment.doctorId, dateKey, TIME_SLOTS).filter(
    (time) =>
      !booked.includes(time) &&
      (dateKey !== getTodayDate() || timeToMinutes(time) > nowMinutes)
  );
};

function BackLink() {
  return (
    <Link
      to="/patient/appointments"
      className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
    >{t("← Back to Appointments")}</Link>
  );
}

function RescheduleAppointment() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { id: appointmentId } = useParams();
  const { user } = useAuth();
  const patientId = useCurrentPatientId();

  // Only the signed-in patient's own appointments can be opened.
  const [appointments] = useState(() => getPatientAppointments(patientId));
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [errors, setErrors] = useState({});
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isRescheduled, setIsRescheduled] = useState(false);

  const appointment = appointments.find(
    (item) => String(item.id) === String(appointmentId)
  );

  /* ---------- Not found / not reschedulable ---------- */

  if (!appointment || !isUpcoming(appointment)) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader
          eyebrow={t("Appointments")}
          title={t("Reschedule Appointment")}
          actions={<BackLink />}
        />

        <EmptyState
          icon="📅"
          title={
            !appointment
              ? t("Appointment not found")
              : ["Cancelled", "Completed"].includes(appointment.status)
                ? t("This appointment is {status}", { status: lower(t(appointment.status)) })
                : t("This appointment has already passed")
          }
          message={
            appointment
              ? t("Only upcoming confirmed or pending appointments can be rescheduled.")
              : t("Return to your appointments and choose an upcoming appointment to reschedule.")
          }
          action={
            <Button onClick={() => navigate("/patient/appointments")}>{t("Back to Appointments")}</Button>
          }
        />
      </div>
    );
  }

  const currentDate = appointment.date;
  const openTimes = getOpenTimes(appointment, selectedDate);

  const validate = () => {
    const nextErrors = {};

    if (!selectedDate) {
      nextErrors.date = t("Please select a new date.");
    } else if (selectedDate < getTodayDate()) {
      nextErrors.date = t("The new date cannot be in the past.");
    }

    if (!selectedTime) {
      nextErrors.time = t("Please select a new time.");
    } else if (!openTimes.includes(selectedTime)) {
      nextErrors.time = t("This time is no longer available. Please choose another.");
    } else if (
      selectedDate === currentDate &&
      selectedTime === appointment.time
    ) {
      nextErrors.time =
        t("This is the current appointment time. Choose a different date or time.");
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (validate()) {
      setIsConfirmationOpen(true);
    }
  };

  const handleConfirm = () => {
    // The doctor confirms the new time again.
    updateAppointment(appointment.id, {
      date: selectedDate,
      time: selectedTime,
      status: "Pending",
    });

    logActivity(
      user,
      `Rescheduled an appointment with ${appointment.doctor}`,
      "Appointments"
    );

    setIsConfirmationOpen(false);
    setIsRescheduled(true);
    showToast(t("Reschedule request sent to the doctor."));
  };

  const currentDetails = (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <Avatar name={appointment.doctor.replace("Dr. ", "")} />

      <div className="min-w-0">
        <p className="font-bold text-slate-900">{appointment.doctor}</p>
        <p className="text-sm text-slate-500">{t(appointment.department)}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {formatAppointmentDateLong(appointment.date)} · {t(appointment.time)}
        </p>
      </div>
    </div>
  );

  /* ---------- Rescheduled ---------- */

  if (isRescheduled) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader
          eyebrow={t("Appointments")}
          title={t("Appointment Rescheduled")}
          description={t("Your new appointment time has been saved.")}
        />

        <ProgressSteps steps={STEPS} current={4} />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
            ✓
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-900">{t("Appointment Successfully Rescheduled")}</h2>

          <dl className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <DetailRow label={t("Doctor")} value={appointment.doctor} />
            <DetailRow label={t("Department")} value={appointment.department} />
            <DetailRow
              label={t("New date")}
              value={formatAppointmentDateLong(selectedDate)}
            />
            <DetailRow label={t("New time")} value={selectedTime} />
          </dl>

          <div className="mt-6 flex justify-center">
            <Button onClick={() => navigate("/patient/appointments")}>{t("Back to Appointments")}</Button>
          </div>
        </section>
      </div>
    );
  }

  /* ---------- Reschedule form ---------- */

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        eyebrow={t("Appointments")}
        title={t("Reschedule Appointment")}
        description={t("Choose a new date and time for your appointment.")}
        actions={<BackLink />}
      />

      <ProgressSteps
        steps={STEPS}
        current={selectedDate && selectedTime ? 3 : 2}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection
          number={1}
          title={t("Current Appointment")}
          description={t("This appointment will be moved.")}
        >
          {currentDetails}
        </FormSection>

        <FormSection
          number={2}
          title={t("Select New Date & Time")}
          description={t("Choose your new appointment slot.")}
        >
          <div className="max-w-xs">
            <Input
              label={t("New Date")}
              type="date"
              name="newDate"
              value={selectedDate}
              min={getTodayDate()}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSelectedTime("");
                setErrors({});
              }}
              error={errors.date}
              required
            />
          </div>

          {selectedDate && openTimes.length > 0 ? (
            <TimeSlotPicker
              slots={openTimes}
              value={selectedTime}
              onChange={(time) => {
                setSelectedTime(time);
                setErrors((previous) => ({ ...previous, time: "" }));
              }}
            />
          ) : selectedDate ? (
            <EmptyState
              icon="🕒"
              title={t("No available times")}
              message={t("{doctor} has no free appointment times on this date. Please choose another day.", { doctor: appointment.doctor })}
            />
          ) : (
            <p className="text-sm text-slate-500">{t("Pick a date to see available times.")}</p>
          )}

          <FieldMessage error={errors.time} />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => navigate("/patient/appointments")}
          >{t("Cancel")}</Button>

          <Button type="submit">{t("Review Changes")}</Button>
        </div>
      </form>

      <Modal
        title={t("Confirm Reschedule")}
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("Current")}</p>
              <p className="mt-1 font-bold text-slate-500 line-through">
                {formatAppointmentDateLong(appointment.date)}
              </p>
              <p className="text-sm text-slate-500">{t(appointment.time)}</p>
            </div>

            <span
              aria-hidden="true"
              className="text-center text-xl font-black text-accent-600"
            >
              →
            </span>

            <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-700">{t("New")}</p>
              <p className="mt-1 font-bold text-slate-900">
                {selectedDate && formatAppointmentDateLong(selectedDate)}
              </p>
              <p className="text-sm text-slate-700">{selectedTime}</p>
            </div>
          </div>

          {currentDetails}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmationOpen(false)}
            >{t("Back & Edit")}</Button>

            <Button onClick={handleConfirm}>{t("Confirm Reschedule")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RescheduleAppointment;
