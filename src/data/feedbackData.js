import { t } from "../i18n";
// Patient-side access to the shared feedback store (the same items
// administrators handle on Feedback Management).

import {
  formatTodayShort,
  getNextFeedbackId,
  loadFeedback,
  saveFeedback,
} from "./adminData";

import { localDate } from "../utils/date";
// Admin workflow status -> what the patient sees.
const PATIENT_STATUS = {
  Open: "Submitted",
  "In Review": "In Review",
  Resolved: "Reviewed",
  Closed: "Reviewed",
};

const toPatientView = (item) => ({
  id: item.id,
  type: item.type,
  subject: item.subject,
  message: item.message,
  rating: item.rating,
  date: localDate(item.submittedAt),
  status: PATIENT_STATUS[item.status] || item.status,
  appointment: item.doctor && item.doctor !== "—" ? item.doctor : t("General Service"),
  response: item.response,
});

const getPriority = ({ type, rating }) =>
  type === "Complaint" || rating <= 2 ? "High" : rating === 3 ? "Medium" : "Low";

export const getPatientFeedback = (patientId) =>
  loadFeedback()
    .filter((item) => String(item.patientId) === String(patientId))
    .map(toPatientView);

export const submitPatientFeedback = (patient, form) => {
  const feedback = loadFeedback();
  const rating = Number(form.rating);

  saveFeedback([
    {
      id: getNextFeedbackId(feedback),
      patientId: patient.id,
      patient: patient.name,
      type: form.type,
      subject: form.subject,
      message: form.message,
      rating,
      doctor: "—",
      department: "General",
      submittedAt: formatTodayShort(),
      status: "Open",
      priority: getPriority({ type: form.type, rating }),
    },
    ...feedback,
  ]);
};

// Editing re-opens the item and clears any previous response.
export const updatePatientFeedback = (id, form) => {
  const rating = Number(form.rating);

  saveFeedback(
    loadFeedback().map((item) =>
      item.id === id
        ? {
            ...item,
            type: form.type,
            subject: form.subject,
            message: form.message,
            rating,
            status: "Open",
            priority: getPriority({ type: form.type, rating }),
            response: undefined,
            respondedAt: undefined,
            respondedBy: undefined,
          }
        : item
    )
  );
};

export const deletePatientFeedback = (id) =>
  saveFeedback(loadFeedback().filter((item) => item.id !== id));
