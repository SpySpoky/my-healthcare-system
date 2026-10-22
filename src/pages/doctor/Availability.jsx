import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/layout/PageHeader";
import { useCurrentDoctorId } from "../../context/useCurrentProfile";
import { loadAvailability, saveAvailability } from "../../data/doctorsData";

import { t } from "../../i18n";
function DoctorAvailability() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEscapeKey(showModal, () => setShowModal(false));

  const doctorId = useCurrentDoctorId();

  const [availability, setAvailabilityState] = useState(() =>
    doctorId ? loadAvailability(doctorId) : []
  );

  // Every change is saved, so patients booking an appointment see
  // the doctor's current working hours.
  const setAvailability = (update) => {
    setAvailabilityState((previous) => {
      const next = typeof update === "function" ? update(previous) : update;

      if (doctorId) {
        saveAvailability(doctorId, next);
      }

      return next;
    });
  };

  const [formData, setFormData] = useState({
    day: "Monday",
    startTime: "",
    endTime: "",
  });

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const selectedDaySlots = availability
    .filter((slot) => slot.day === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  /* =========================================================
     MODAL
     ========================================================= */

  const openAddModal = () => {
    setEditingSlot(null);

    setFormData({
      day: selectedDay,
      startTime: "",
      endTime: "",
    });

    setAlertMessage("");
    setAlertType("success");
    setShowModal(true);
  };

  const openEditModal = (slot) => {
    setEditingSlot(slot);

    setFormData({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    setAlertMessage("");
    setAlertType("success");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSlot(null);
    setAlertMessage("");
    setAlertType("success");
  };

  /* =========================================================
     FORM
     ========================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const timeToMinutes = (time) => {
    if (!time) {
      return 0;
    }

    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  };

  const hasConflict = () => {
    const newStart = timeToMinutes(formData.startTime);
    const newEnd = timeToMinutes(formData.endTime);

    return availability.some((slot) => {
      if (slot.day !== formData.day) {
        return false;
      }

      if (editingSlot && slot.id === editingSlot.id) {
        return false;
      }

      const existingStart = timeToMinutes(slot.startTime);
      const existingEnd = timeToMinutes(slot.endTime);

      return newStart < existingEnd && newEnd > existingStart;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.startTime || !formData.endTime) {
      setAlertType("error");
      setAlertMessage(
        t("Please select both a start time and an end time.")
      );
      return;
    }

    const start = timeToMinutes(formData.startTime);
    const end = timeToMinutes(formData.endTime);

    if (start >= end) {
      setAlertType("error");
      setAlertMessage(
        t("End time must be later than start time.")
      );
      return;
    }

    if (hasConflict()) {
      setAlertType("error");
      setAlertMessage(
        t("This time overlaps with an existing availability slot.")
      );
      return;
    }

    if (editingSlot) {
      setAvailability((previous) =>
        previous.map((slot) =>
          slot.id === editingSlot.id
            ? {
                ...slot,
                day: formData.day,
                startTime: formData.startTime,
                endTime: formData.endTime,
              }
            : slot
        )
      );

      setAlertMessage(
        t("Availability slot updated successfully.")
      );
    } else {
      setAvailability((previous) => [
        ...previous,
        {
          id: Date.now(),
          day: formData.day,
          startTime: formData.startTime,
          endTime: formData.endTime,
          status: "Available",
        },
      ]);

      setAlertMessage(
        t("Availability slot added successfully.")
      );
    }

    setAlertType("success");
    setShowModal(false);
    setEditingSlot(null);

    setTimeout(() => {
      setAlertMessage("");
    }, 3000);
  };

  /* =========================================================
     DELETE
     ========================================================= */

  const handleDelete = (slotId) => {
    setPendingDeleteId(slotId);
  };

  const confirmDelete = () => {
    const slotId = pendingDeleteId;
    setPendingDeleteId(null);

    setAvailability((previous) =>
      previous.filter((slot) => slot.id !== slotId)
    );

    setAlertType("success");
    setAlertMessage(
      t("Availability slot removed successfully.")
    );

    setTimeout(() => {
      setAlertMessage("");
    }, 3000);
  };

  /* =========================================================
     ENABLE / DISABLE
     ========================================================= */

  const toggleSlotStatus = (slotId) => {
    setAvailability((previous) =>
      previous.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              status:
                slot.status === "Available"
                  ? "Unavailable"
                  : "Available",
            }
          : slot
      )
    );
  };

  /* =========================================================
     DAY SELECTION
     ========================================================= */

  const handleDaySelect = (day) => {
    setSelectedDay(day);
  };

  /* =========================================================
     WEEKLY CALENDAR
     ========================================================= */

  const getDaySlots = (day) => {
    return availability
      .filter((slot) => slot.day === day)
      .sort((a, b) => {
        return (
          timeToMinutes(a.startTime) -
          timeToMinutes(b.startTime)
        );
      });
  };

  const getDayStatus = (day) => {
    const daySlots = getDaySlots(day);

    if (daySlots.length === 0) {
      return "Unavailable";
    }

    if (
      daySlots.some(
        (slot) => slot.status === "Available"
      )
    ) {
      return "Available";
    }

    return "Unavailable";
  };

  const getDayCount = (day) => {
    return availability.filter(
      (slot) => slot.day === day
    ).length;
  };

  const totalSlots = availability.length;

  const availableSlots = availability.filter(
    (slot) => slot.status === "Available"
  ).length;

  const unavailableSlots = availability.filter(
    (slot) => slot.status === "Unavailable"
  ).length;

  if (!doctorId) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <PageHeader
          eyebrow={t("Doctor Workspace")}
          title={t("Availability")}
        />

        <EmptyState
          icon="🗓️"
          title={t("Availability is managed by doctors")}
          message={t("Medical staff accounts do not have a personal appointment schedule. Doctors set their own weekly availability here.")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 p-6 text-white shadow-2xl shadow-indigo-500/20 sm:p-8">

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

        <div className="pointer-events-none absolute -bottom-32 right-24 h-80 w-80 rounded-full border border-white/10 bg-white/5" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div className="max-w-2xl">

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur-md">

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />{t("DOCTOR WORKSPACE")}</div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("Availability")}</h1>

            <p className="mt-3 text-sm leading-6 text-indigo-100 sm:text-base">{t("Manage your working hours and available appointment time slots.")}</p>

          </div>

          <Link
            to="/doctor/appointments"
            className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-xl"
          >
            <span className="text-lg">📅</span>{t("View Appointments")}<span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>

        </div>

      </section>


      {/* =====================================================
          SUMMARY
          ===================================================== */}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="group relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="text-sm font-semibold text-slate-500">{t("Total Slots")}</span>

              <strong className="mt-2 block text-4xl font-black text-slate-900">
                {totalSlots}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Across your weekly schedule")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600 shadow-sm">
              🗓️
            </div>

          </div>

        </div>


        <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="text-sm font-semibold text-slate-500">{t("Available")}</span>

              <strong className="mt-2 block text-4xl font-black text-slate-900">
                {availableSlots}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Active appointment slots")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-600 shadow-sm">
              ✓
            </div>

          </div>

        </div>


        <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/70 transition-transform duration-500 group-hover:scale-125" />

          <div className="relative flex items-center justify-between">

            <div>

              <span className="text-sm font-semibold text-slate-500">{t("Disabled")}</span>

              <strong className="mt-2 block text-4xl font-black text-slate-900">
                {unavailableSlots}
              </strong>

              <span className="mt-1 block text-xs font-medium text-slate-400">{t("Temporarily unavailable")}</span>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-2xl text-slate-500 shadow-sm">
              ⏸
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          ALERT
          ===================================================== */}

      {alertMessage && (
        <div
          role={alertType === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-sm ${
            alertType === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >

          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold ${
              alertType === "error"
                ? "bg-rose-100 text-rose-600"
                : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {alertType === "error" ? "!" : "✓"}
          </div>

          <div className="pt-1 text-sm font-semibold">
            {alertMessage}
          </div>

        </div>
      )}


      {/* =====================================================
          WEEKLY CALENDAR VIEW
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

          <div className="flex flex-col gap-3">

            <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("WEEKLY OVERVIEW")}</div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("Weekly Calendar")}</h2>

            <p className="max-w-2xl text-sm leading-6 text-slate-500">{t("View your availability across the entire week. Select a day to manage its time slots.")}</p>

          </div>

        </div>


        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">

          {days.map((day) => {

            const daySlots = getDaySlots(day);
            const dayStatus = getDayStatus(day);
            const isSelected = selectedDay === day;

            return (
              <button
                type="button"
                key={day}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-indigo-400 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-lg ring-2 ring-indigo-500/10"
                    : "border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                }`}
                onClick={() => handleDaySelect(day)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              >

                {isSelected && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
                )}

                <div className="flex items-start justify-between gap-2">

                  <strong
                    className={`text-sm font-black ${
                      isSelected
                        ? "text-indigo-700"
                        : "text-slate-800"
                    }`}
                  >
                    {t(day)}
                  </strong>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      dayStatus === "Available"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t(dayStatus)}
                  </span>

                </div>


                <div className="mt-4 space-y-2">

                  {daySlots.length === 0 ? (

                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center">

                      <span className="text-xs font-medium text-slate-400">{t("No availability")}</span>

                    </div>

                  ) : (

                    daySlots.map((slot) => (

                      <div
                        className={`rounded-xl border p-3 ${
                          slot.status === "Available"
                            ? "border-emerald-100 bg-emerald-50/70"
                            : "border-slate-200 bg-slate-50"
                        }`}
                        key={slot.id}
                      >

                        <strong
                          className={`block text-xs font-black ${
                            slot.status === "Available"
                              ? "text-emerald-800"
                              : "text-slate-500"
                          }`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </strong>

                        <span
                          className={`mt-1 block text-[10px] font-semibold ${
                            slot.status === "Available"
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          {t(slot.status)}
                        </span>

                      </div>

                    ))

                  )}

                </div>


                <div
                  className={`mt-4 border-t pt-3 text-[11px] font-bold ${
                    isSelected
                      ? "border-indigo-100 text-indigo-600"
                      : "border-slate-100 text-slate-400"
                  }`}
                >{daySlots.length === 1 ? t("1 slot") : t("{count} slots", { count: daySlots.length })}
                </div>

              </button>
            );
          })}

        </div>


        <div className="flex flex-wrap items-center gap-5 border-t border-slate-100 bg-slate-50/50 px-6 py-4 text-xs font-semibold text-slate-500">

          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t("Available")}</span>

          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-slate-400" />{t("Unavailable")}</span>

          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-indigo-500" />{t("Selected Day")}</span>

        </div>

      </section>


      {/* =====================================================
          WEEKLY SCHEDULE
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-5 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">

          <div>

            <div className="text-xs font-black tracking-[0.2em] text-violet-600">{t("SCHEDULE MANAGEMENT")}</div>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Weekly Schedule")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Select a day to view and manage your availability.")}</p>

          </div>

          <button
            type="button"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl"
            onClick={openAddModal}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <span className="text-lg transition-transform group-hover:rotate-90">
              +
            </span>{t("Add Availability")}</button>

        </div>


        {/* ===================================================
            DAY SELECTOR
            =================================================== */}

        <div className="border-b border-slate-100 bg-slate-50/50 p-4">

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">

            {days.map((day) => {

              const dayHasSlots = availability.some(
                (slot) => slot.day === day
              );

              const dayCount = getDayCount(day);
              const isSelected = selectedDay === day;

              return (
                <button
                  type="button"
                  key={day}
                  className={`relative rounded-xl px-3 py-3 text-center transition-all duration-200 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                  onClick={() => handleDaySelect(day)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                >

                  <span className="block text-sm font-bold">
                    {t(day)}
                  </span>

                  {dayHasSlots && (
                    <small
                      className={`mt-1 block text-[10px] font-semibold ${
                        isSelected
                          ? "text-indigo-100"
                          : "text-slate-400"
                      }`}
                    >{dayCount === 1 ? t("1 slot") : t("{count} slots", { count: dayCount })}
                    </small>
                  )}

                </button>
              );
            })}

          </div>

        </div>


        {/* ===================================================
            SELECTED DAY
            =================================================== */}

        <div className="p-6 sm:p-7">

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl text-white shadow-lg shadow-indigo-500/20">
                  📅
                </div>

                <div>

                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    {t(selectedDay)}
                  </h3>

                  <p className="text-sm text-slate-500">{t("Available appointment hours")}</p>

                </div>

              </div>

            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
              onClick={openAddModal}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <span>+</span>{t("Add Slot")}</button>

          </div>


          {selectedDaySlots.length === 0 ? (

            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                🕒
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-900">{t("No Availability")}</h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t("You currently have no available time slots for {selectedDay}.", { selectedDay: t(selectedDay) })}</p>

              <button
                type="button"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                onClick={openAddModal}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <span>+</span>{t("Add Availability")}</button>

            </div>

          ) : (

            <div className="space-y-4">

              {selectedDaySlots.map((slot) => (

                <div
                  role="group"
                  aria-label={t("{day} {startTime} to {endTime}", { day: t(slot.day), startTime: slot.startTime, endTime: slot.endTime })}
                  className={`group flex flex-col gap-5 rounded-2xl border p-5 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${
                    slot.status === "Available"
                      ? "border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white hover:border-emerald-200 hover:shadow-lg"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:shadow-md"
                  }`}
                  key={slot.id}
                >

                  <div className="flex items-center gap-4">

                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm ${
                        slot.status === "Available"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      🕒
                    </div>

                    <div>

                      <strong className="block text-xl font-black tracking-tight text-slate-900">
                        {slot.startTime} - {slot.endTime}
                      </strong>

                      <span
                        className={`mt-1 inline-flex items-center gap-2 text-xs font-bold ${
                          slot.status === "Available"
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            slot.status === "Available"
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {t(slot.status)}
                      </span>

                    </div>

                  </div>


                  <div className="flex flex-wrap items-center gap-2">

                    <button
                      type="button"
                      className={`rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${
                        slot.status === "Available"
                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-md"
                          : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg"
                      }`}
                      onClick={() =>
                        toggleSlotStatus(slot.id)
                      }
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      {slot.status === "Available"
                        ? t("Disable")
                        : t("Enable")}
                    </button>


                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
                      onClick={() =>
                        openEditModal(slot)
                      }
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                    >{t("Edit")}</button>


                    <button
                      type="button"
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md"
                      onClick={() =>
                        handleDelete(slot.id)
                      }
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                    >{t("Remove")}</button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>


      {/* =====================================================
          AVAILABILITY INFORMATION
          ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

          <div className="text-xs font-black tracking-[0.2em] text-indigo-600">{t("INFORMATION")}</div>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t("Availability Information")}</h2>

          <p className="mt-1 text-sm text-slate-500">{t("Keep your schedule updated to help patients find suitable appointment times.")}</p>

        </div>


        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">

            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              ✓
            </div>

            <strong className="block text-sm font-black text-slate-900">{t("Available Slots")}</strong>

            <span className="mt-2 block text-sm leading-6 text-slate-500">{t("Patients can request appointments during active availability slots.")}</span>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">

            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
              ⏸
            </div>

            <strong className="block text-sm font-black text-slate-900">{t("Disabled Slots")}</strong>

            <span className="mt-2 block text-sm leading-6 text-slate-500">{t("Disabled slots remain in your schedule but cannot be selected for new appointments.")}</span>

          </div>


          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">

            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              !
            </div>

            <strong className="block text-sm font-black text-slate-900">{t("Schedule Conflicts")}</strong>

            <span className="mt-2 block text-sm leading-6 text-slate-500">{t("Overlapping availability times are not allowed.")}</span>

          </div>

        </div>

      </section>


      {/* =====================================================
          ADD / EDIT MODAL
          ===================================================== */}

      {showModal && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingSlot ? t("Edit availability slot") : t("Add availability slot")}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >

            {/* Modal Header */}

            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 px-6 py-6 text-white">

              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10 bg-white/5" />

              <div className="relative flex items-start justify-between gap-4">

                <div>

                  <div className="mb-2 text-xs font-bold tracking-[0.18em] text-indigo-100">{t("SCHEDULE")}</div>

                  <h2 className="text-2xl font-black">
                    {editingSlot
                      ? t("Edit Availability")
                      : t("Add Availability")}
                  </h2>

                  <p className="mt-1 text-sm text-indigo-100">{t("Set the day and working hours for this slot.")}</p>

                </div>

                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-bold text-white transition-all hover:bg-white/20"
                  onClick={closeModal}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                >
                  ×
                </button>

              </div>

            </div>


            <form noValidate onSubmit={handleSubmit}>

              <div className="space-y-6 p-6">

                {alertMessage && alertType === "error" && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                  >

                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 font-black">
                      !
                    </span>

                    <span className="pt-1">
                      {alertMessage}
                    </span>

                  </div>
                )}


                {/* Day */}

                <div>

                  <label
                    htmlFor="availability-day"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >{t("Day")}</label>

                  <div className="relative">

                    <select
                      id="availability-day"
                      name="day"
                      value={formData.day}
                      onChange={handleChange}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    >

                      {days.map((day) => (

                        <option
                          key={day}
                          value={day}
                        >
                          {t(day)}
                        </option>

                      ))}

                    </select>

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ▾
                    </span>

                  </div>

                </div>


                {/* Time */}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <div>

                    <label
                      htmlFor="availability-start"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >{t("Start Time")}</label>

                    <input
                      id="availability-start"
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    />

                  </div>


                  <div>

                    <label
                      htmlFor="availability-end"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >{t("End Time")}</label>

                    <input
                      id="availability-end"
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    />

                  </div>

                </div>


                {/* Preview */}

                {formData.startTime && formData.endTime && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">

                    <div className="text-xs font-black uppercase tracking-wider text-indigo-500">{t("Slot Preview")}</div>

                    <div className="mt-2 flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        🕒
                      </div>

                      <div>

                        <strong className="block text-sm font-black text-slate-900">
                          {t(formData.day)}
                        </strong>

                        <span className="text-sm font-semibold text-indigo-600">
                          {formData.startTime} - {formData.endTime}
                        </span>

                      </div>

                    </div>

                  </div>
                )}

              </div>


              {/* Modal Footer */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                  onClick={closeModal}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                >{t("Cancel")}</button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                >
                  {editingSlot
                    ? t("Save Changes")
                    : t("Add Slot")}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title={t("Remove availability slot?")}
        message={t("Patients will no longer be able to book this time slot.")}
        confirmText={t("Remove Slot")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

    </div>
  );
}

export default DoctorAvailability;