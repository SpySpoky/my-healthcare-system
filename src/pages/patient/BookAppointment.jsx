import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import Select from "../../components/forms/Select";
import PageHeader from "../../components/layout/PageHeader";
import { useToast } from "../../context/useToast";
import { useAuth } from "../../context/useAuth";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { logActivity } from "../../data/adminData";
import {
  MOCK_DOCTORS,
  TIME_SLOTS,
  formatAppointmentDateLong,
  getBookedTimes,
  getNextAppointmentId,
  loadAppointments,
  saveAppointments,
} from "../../data/appointmentData";
import { DEPARTMENTS, getDoctorTimesForDate } from "../../data/doctorsData";
import { getPatientById } from "../../data/patientsData";
import { getTodayDate, timeToMinutes } from "../../utils/date";

import { t } from "../../i18n";
const STEPS = ["Doctor", "Date & Time", "Confirmation"];

const REASON_MIN_LENGTH = 5;
const REASON_MAX_LENGTH = 200;

// Times the doctor works on that date that are not already booked
// (and, for today, not already past).
const getOpenTimes = (doctorId, dateKey) => {
  if (!doctorId || !dateKey) {
    return [];
  }

  const booked = getBookedTimes(doctorId, dateKey);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return getDoctorTimesForDate(doctorId, dateKey, TIME_SLOTS).filter(
    (time) =>
      !booked.includes(time) &&
      (dateKey !== getTodayDate() || timeToMinutes(time) > nowMinutes)
  );
};

const INITIAL_FORM = {
  department: "",
  doctorId: "",
  date: "",
  time: "",
  reason: "",
};

const validateBooking = (form) => {
  const errors = {};
  const reason = form.reason.trim();

  if (!form.department) {
    errors.department = t("Please select a department.");
  }

  if (!form.doctorId) {
    errors.doctorId = t("Please select a doctor.");
  }

  if (!form.date) {
    errors.date = t("Please select a date.");
  } else if (form.date < getTodayDate()) {
    errors.date = t("The appointment date cannot be in the past.");
  }

  if (!form.time) {
    errors.time = t("Please select a time.");
  } else if (!getOpenTimes(form.doctorId, form.date).includes(form.time)) {
    errors.time = t("This time is no longer available. Please choose another.");
  }

  if (!reason) {
    errors.reason = t("Please enter a reason for the appointment.");
  } else if (reason.length < REASON_MIN_LENGTH) {
    errors.reason = t("The reason must be at least {REASON_MIN_LENGTH} characters.", { REASON_MIN_LENGTH });
  }

  return errors;
};

function BookAppointment() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const patientId = useCurrentPatientId();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [bookedId, setBookedId] = useState("");

  // Departments that have doctors, read when the page renders so
  // newly approved doctors appear.
  const departmentOptions = DEPARTMENTS.map((department) => ({
    value: department,
    label: department,
  }));

  const doctors = MOCK_DOCTORS.filter(
    (doctor) => doctor.department === form.department
  );
  const selectedDoctor = MOCK_DOCTORS.find(
    (doctor) => doctor.id === form.doctorId
  );

  const currentStep = form.doctorId ? 2 : 1;
  const openTimes = getOpenTimes(form.doctorId, form.date);

  // Changing an earlier choice clears the choices that depend on it.
  const updateForm = (changes) => {
    setForm((previous) => ({ ...previous, ...changes }));
    setErrors((previous) => {
      const next = { ...previous };
      Object.keys(changes).forEach((key) => delete next[key]);
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = validateBooking(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsConfirmationOpen(true);
    }
  };

  const handleConfirm = () => {
    const appointments = loadAppointments();
    const newId = getNextAppointmentId(appointments);

    const patient = getPatientById(patientId);

    saveAppointments([
      ...appointments,
      {
        id: newId,
        patientId,
        patient: patient?.name || user?.name || "Patient",
        doctorId: selectedDoctor.id,
        doctor: selectedDoctor.name,
        department: selectedDoctor.department,
        date: form.date,
        time: form.time,
        reason: form.reason.trim(),
        symptoms: "",
        status: "Pending",
      },
    ]);

    logActivity(
      user,
      `Booked appointment with ${selectedDoctor.name}`,
      "Appointments"
    );

    setBookedId(`APT-${String(newId).padStart(4, "0")}`);
    setIsConfirmationOpen(false);
    showToast(t("Appointment requested. The doctor will confirm it shortly."));
  };

  const handleBookAnother = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setBookedId("");
  };

  const summary = selectedDoctor && (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <DetailRow label={t("Doctor")} value={selectedDoctor.name} />
      <DetailRow label={t("Department")} value={selectedDoctor.department} />
      <DetailRow
        label={t("Date")}
        value={form.date ? formatAppointmentDateLong(form.date) : "—"}
      />
      <DetailRow label={t("Time")} value={form.time || "—"} />
      <div className="sm:col-span-2">
        <DetailRow label={t("Reason")} value={form.reason.trim() || "—"} />
      </div>
    </dl>
  );

  /* ---------- Booked ---------- */

  if (bookedId) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader
          eyebrow={t("Appointments")}
          title={t("Appointment Requested")}
          description={t("Your request has been sent to the doctor and added to your appointments.")}
        />

        <ProgressSteps steps={STEPS} current={4} />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
            ✓
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-900">{t("Appointment Request Sent")}</h2>

          <p className="mt-2 text-sm text-slate-500">{t("Appointment ID")} <strong className="font-mono text-slate-800">{bookedId}</strong>
          </p>

          <div className="mt-6 text-left">{summary}</div>

          <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
            <Button variant="secondary" onClick={handleBookAnother}>{t("Book Another Appointment")}</Button>

            <Button onClick={() => navigate("/patient/appointments")}>{t("View My Appointments")}</Button>
          </div>
        </section>
      </div>
    );
  }

  /* ---------- Booking form ---------- */

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        eyebrow={t("Appointments")}
        title={t("Book Appointment")}
        description={t("Choose a department, doctor, date and time to schedule a new appointment.")}
        actions={
          <Link
            to="/patient/appointments"
            className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
          >{t("← Back to Appointments")}</Link>
        }
      />

      <ProgressSteps steps={STEPS} current={currentStep} />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection
          number={1}
          title={t("Select Department")}
          description={t("Choose the department you need.")}
        >
          <Select
            label={t("Department")}
            name="department"
            value={form.department}
            onChange={(event) =>
              updateForm({
                department: event.target.value,
                doctorId: "",
                date: "",
                time: "",
              })
            }
            options={departmentOptions}
            placeholder={t("Select a department")}
            error={errors.department}
            required
          />
        </FormSection>

        <FormSection
          number={2}
          title={t("Select Doctor")}
          description={t("Choose an available doctor.")}
        >
          {!form.department ? (
            <EmptyState
              icon="🩺"
              title={t("Select a department first")}
              message={t("Available doctors will appear here.")}
            />
          ) : doctors.length === 0 ? (
            <EmptyState
              icon="🩺"
              title={t("No doctors available")}
              message={t("No doctors are currently available in this department.")}
            />
          ) : (
            <div
              role="radiogroup"
              aria-label={t("Doctor")}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {doctors.map((doctor) => {
                const isSelected = form.doctorId === doctor.id;

                return (
                  <button
                    key={doctor.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() =>
                      updateForm({ doctorId: doctor.id, date: "", time: "" })
                    }
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-accent-500 bg-accent-50 ring-4 ring-accent-500/10"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
                    }`}
                  >
                    <Avatar name={doctor.name.replace("Dr. ", "")} />

                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-slate-900">
                        {doctor.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {t(doctor.specialty)}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {doctor.availability}
                      </span>
                    </span>

                    {isSelected && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-sm text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <FieldMessage error={errors.doctorId} />
        </FormSection>

        <FormSection
          number={3}
          title={t("Select Date & Time")}
          description={t("Choose your preferred appointment slot.")}
        >
          {!selectedDoctor ? (
            <EmptyState
              icon="📅"
              title={t("Select a doctor first")}
              message={t("Available dates and times will appear here.")}
            />
          ) : (
            <div>
              <div className="max-w-xs">
                <Input
                  label={t("Appointment Date")}
                  type="date"
                  name="date"
                  value={form.date}
                  min={getTodayDate()}
                  onChange={(event) =>
                    updateForm({ date: event.target.value, time: "" })
                  }
                  error={errors.date}
                  required
                />
              </div>

              {form.date && openTimes.length > 0 ? (
                <TimeSlotPicker
                  slots={openTimes}
                  value={form.time}
                  onChange={(time) => updateForm({ time })}
                />
              ) : form.date ? (
                <EmptyState
                  icon="🕒"
                  title={t("No available times")}
                  message={t("{name} has no free appointment times on this date. Please choose another day.", { name: selectedDoctor.name })}
                />
              ) : (
                <p className="text-sm text-slate-500">{t("Pick a date to see available times.")}</p>
              )}

              <FieldMessage error={errors.time} />
            </div>
          )}
        </FormSection>

        <FormSection
          number={4}
          title={t("Appointment Reason")}
          description={t("Briefly describe why you need the appointment.")}
        >
          <Input
            label={t("Reason for Appointment")}
            name="reason"
            placeholder={t("e.g. Routine check-up")}
            value={form.reason}
            maxLength={REASON_MAX_LENGTH}
            onChange={(event) => updateForm({ reason: event.target.value })}
            error={errors.reason}
            hint={t("{length} / {REASON_MAX_LENGTH} characters", { length: form.reason.length, REASON_MAX_LENGTH })}
            required
          />
        </FormSection>

        {Object.keys(errors).length > 0 && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >{t("Please fix the highlighted fields before continuing.")}</p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => navigate("/patient/appointments")}
          >{t("Cancel")}</Button>

          <Button type="submit">{t("Review Appointment")}</Button>
        </div>
      </form>

      <Modal
        title={t("Confirm Appointment")}
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">{t("Review your appointment details before confirming.")}</p>

          {summary}

          <p className="rounded-2xl border border-accent-100 bg-accent-50 p-4 text-sm text-slate-600">{t("Your request will appear in your upcoming appointments as Pending until the doctor confirms it.")}</p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmationOpen(false)}
            >{t("Back & Edit")}</Button>

            <Button onClick={handleConfirm}>{t("Confirm Appointment")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default BookAppointment;
