import { useState } from "react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Button from "../../components/forms/Button";
import Select from "../../components/forms/Select";
import Input from "../../components/forms/Input";
import Textarea from "../../components/forms/Textarea";
import { validateFeedbackForm } from "../../utils/validation/feedbackValidation";
import { useToast } from "../../context/useToast";
import { useAuth } from "../../context/useAuth";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { logActivity } from "../../data/adminData";
import {
  deletePatientFeedback,
  getPatientFeedback,
  submitPatientFeedback,
  updatePatientFeedback,
} from "../../data/feedbackData";
import { getPatientById } from "../../data/patientsData";

import { t } from "../../i18n";
function Feedback() {
  const showToast = useToast();

  const { user } = useAuth();
  const patientId = useCurrentPatientId();

  const [feedbackList, setFeedbackList] = useState(() =>
    getPatientFeedback(patientId)
  );

  const refreshFeedback = () =>
    setFeedbackList(getPatientFeedback(patientId));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editingFeedback, setEditingFeedback] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const [form, setForm] = useState({
    type: "Feedback",
    subject: "",
    message: "",
    rating: "5",
  });

  const [errors, setErrors] = useState({});

  const openCreateForm = () => {
    setEditingFeedback(null);

    setForm({
      type: "Feedback",
      subject: "",
      message: "",
      rating: "5",
    });

    setErrors({});

    setIsFormOpen(true);
  };

  const openEditForm = (feedback) => {
    setEditingFeedback(feedback);

    setForm({
      type: feedback.type,
      subject: feedback.subject,
      message: feedback.message,
      rating: String(feedback.rating),
    });

    setErrors({});

    setIsFormOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  };

  const handleRatingChange = (rating) => {
    setForm((currentForm) => ({
      ...currentForm,
      rating: String(rating),
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      rating: "",
    }));
  };

  const validateForm = () => {
    const newErrors = validateFeedbackForm(form);

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    const trimmedSubject = form.subject.trim();
    const trimmedMessage = form.message.trim();

    const submission = {
      type: form.type,
      subject: trimmedSubject,
      message: trimmedMessage,
      rating: form.rating,
    };

    if (editingFeedback) {
      updatePatientFeedback(editingFeedback.id, submission);
      refreshFeedback();
      showToast(t("Feedback updated successfully."));
    } else {
      submitPatientFeedback(
        getPatientById(patientId) || { id: patientId, name: user?.name },
        submission
      );
      refreshFeedback();
      logActivity(user, `Submitted ${form.type.toLowerCase()}: ${trimmedSubject}`, "Feedback");
      showToast(t("Feedback submitted successfully."));
    }

    setIsFormOpen(false);
    setEditingFeedback(null);
    setErrors({});
  };

  const openDeleteDialog = (feedback) => {
    setSelectedFeedback(feedback);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    deletePatientFeedback(selectedFeedback.id);
    refreshFeedback();
    setSelectedFeedback(null);
    setIsDeleteOpen(false);

    showToast(t("Feedback deleted successfully."));
  };

  const renderStars = (rating) => {
    return (
      <span
        className="text-lg tracking-wide text-amber-400"
        aria-label={t("{rating} out of 5 stars", { rating })}
      >
        {"★".repeat(rating)}
        <span className="text-slate-300">
          {"☆".repeat(5 - rating)}
        </span>
      </span>
    );
  };

  const totalFeedback = feedbackList.length;

  const submittedFeedback = feedbackList.filter(
    (feedback) =>
      feedback.status === "Submitted"
  ).length;

  const reviewedFeedback = feedbackList.filter(
    (feedback) =>
      feedback.status === "Reviewed"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* Header */}

      <div className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 p-6 text-white shadow-xl shadow-cyan-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-8">

        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("Feedback")}</h1>

          <p className="mt-2 max-w-xl text-sm text-cyan-50 sm:text-base">{t("Share your comments, complaints, suggestions, and service ratings.")}</p>
        </div>

        <Button onClick={openCreateForm}>{t("+ Submit Feedback")}</Button>

      </div>


      {/* Feedback Summary */}

      <section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Total */}

          <Card>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-6">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-200/40" />

              <span className="relative block text-sm font-semibold text-cyan-700">{t("Total Feedback")}</span>

              <strong className="relative mt-2 block text-4xl font-black text-slate-900">
                {totalFeedback}
              </strong>

              <p className="relative mt-1 text-xs text-slate-500">{t("All submissions")}</p>

            </div>
          </Card>


          {/* Submitted */}

          <Card>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 p-6">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-200/40" />

              <span className="relative block text-sm font-semibold text-amber-700">{t("Submitted")}</span>

              <strong className="relative mt-2 block text-4xl font-black text-slate-900">
                {submittedFeedback}
              </strong>

              <p className="relative mt-1 text-xs text-slate-500">{t("Waiting for review")}</p>

            </div>
          </Card>


          {/* Reviewed */}

          <Card>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 p-6">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-200/40" />

              <span className="relative block text-sm font-semibold text-emerald-700">{t("Reviewed")}</span>

              <strong className="relative mt-2 block text-4xl font-black text-slate-900">
                {reviewedFeedback}
              </strong>

              <p className="relative mt-1 text-xs text-slate-500">{t("Reviewed by administration")}</p>

            </div>
          </Card>

        </div>

      </section>


      {/* Previous Feedback */}

      <section>

        <div className="mb-5">

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("My Feedback")}</h2>

          <p className="mt-1 text-sm text-slate-500">{t("View your submitted feedback and check its current status.")}</p>

        </div>


        <div className="space-y-5">

          {feedbackList.length === 0 ? (

            <Card>

              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-emerald-100 text-3xl">
                  💬
                </div>

                <h3 className="text-xl font-bold text-slate-900">{t("No feedback submitted yet")}</h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{t("You have not submitted any feedback, complaints, or suggestions yet.")}</p>

                <div className="mt-5">
                  <Button onClick={openCreateForm}>{t("Submit Your First Feedback")}</Button>
                </div>

              </div>

            </Card>

          ) : (

            feedbackList.map((feedback) => (

              <Card
                key={feedback.id}
                as="article"
                aria-label={feedback.subject}
              >

                <div className="space-y-5">

                  {/* Feedback Header */}

                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-xl font-bold text-slate-900">
                          {feedback.subject}
                        </h3>

                        <Badge
                          variant={
                            feedback.type === "Complaint"
                              ? "danger"
                              : feedback.type === "Suggestion"
                                ? "warning"
                                : "info"
                          }
                        >
                          {t(feedback.type)}
                        </Badge>

                      </div>

                      <p className="mt-1 text-sm text-slate-500">{t("Submitted on {date}", { date: feedback.date })}</p>

                    </div>


                    {/* Status */}

                    <Badge
                      variant={
                        feedback.status === "Reviewed"
                          ? "success"
                          : feedback.status === "Submitted"
                            ? "warning"
                            : "default"
                      }
                    >
                      {t(feedback.status)}
                    </Badge>

                  </div>


                  {/* Rating */}

                  <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">

                    {renderStars(feedback.rating)}

                    <span className="text-sm font-bold text-slate-700">
                      {feedback.rating}/5
                    </span>

                  </div>


                  {/* Message */}

                  <div className="rounded-2xl bg-slate-50 p-5">

                    <p className="text-sm leading-7 text-slate-700">
                      {feedback.message}
                    </p>

                  </div>


                  {/* Appointment */}

                  <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">

                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Related appointment")}</span>

                    <strong className="text-sm text-slate-800">
                      {feedback.appointment}
                    </strong>

                  </div>


                  {/* Status Information */}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                      <strong className="text-sm font-bold text-slate-900">{t("Feedback Status")}</strong>

                      <span className="text-sm font-semibold text-slate-500">
                        {t(feedback.status)}
                      </span>

                    </div>


                    {feedback.status === "Submitted" && (

                      <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                          ⏳
                        </span>

                        <div>

                          <strong className="block text-sm font-bold text-amber-900">{t("Waiting for review")}</strong>

                          <p className="mt-1 text-sm leading-6 text-amber-800">{t("Your feedback has been submitted successfully and is waiting for review.")}</p>

                        </div>

                      </div>

                    )}


                    {feedback.status === "Reviewed" && (

                      <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                          ✓
                        </span>

                        <div>

                          <strong className="block text-sm font-bold text-emerald-900">{t("Feedback reviewed")}</strong>

                          <p className="mt-1 text-sm leading-6 text-emerald-800">{t("Your feedback has been reviewed by the healthcare administration.")}</p>

                        </div>

                      </div>

                    )}

                  </div>


                  {/* Admin Response */}

                  {feedback.response ? (

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <strong className="text-sm font-bold text-slate-900">{t("Admin Response")}</strong>

                        <Badge variant="success">{t("Responded")}</Badge>

                      </div>

                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        {feedback.response}
                      </p>

                    </div>

                  ) : (

                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">

                      <strong className="block text-sm font-bold text-slate-700">{t("No response yet")}</strong>

                      <p className="mt-1 text-sm leading-6 text-slate-500">{t("An administrative response will appear here when available.")}</p>

                    </div>

                  )}


                  {/* Actions */}

                  {feedback.status === "Submitted" ? (
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                      <Button
                        variant="secondary"
                        onClick={() =>
                          openEditForm(feedback)
                        }
                      >{t("Edit")}</Button>

                      <Button
                        variant="danger"
                        onClick={() =>
                          openDeleteDialog(feedback)
                        }
                      >{t("Delete")}</Button>

                    </div>
                  ) : (
                    <p className="border-t border-slate-100 pt-5 text-right text-xs text-slate-400">{t("This feedback is being handled by our team and can no longer be edited.")}</p>
                  )}

                </div>

              </Card>

            ))

          )}

        </div>

      </section>


      {/* Submit/Edit Feedback Modal */}

      <Modal
        title={
          editingFeedback
            ? t("Edit Feedback")
            : t("Submit Feedback")
        }
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFeedback(null);
          setErrors({});
        }}
      >

        <form noValidate onSubmit={handleSubmit}>

          {/* Feedback Type */}

          <Select
            label={t("Feedback Type")}
            name="type"
            value={form.type}
            onChange={handleChange}
            options={[
              {
                value: "Feedback",
                label: t("Feedback"),
              },
              {
                value: "Complaint",
                label: t("Complaint"),
              },
              {
                value: "Suggestion",
                label: t("Suggestion"),
              },
            ]}
            error={errors.type}
            required
          />


          {/* Subject */}

          <Input
            label={t("Subject")}
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder={t("Enter a subject")}
            error={errors.subject}
            hint={`${form.subject.length}/100 characters`}
            maxLength={100}
            required
          />


          {/* Message */}

          <Textarea
            label={t("Message")}
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder={t("Write your feedback...")}
            error={errors.message}
            hint={`${form.message.length}/1000 characters`}
            maxLength={1000}
            required
          />


          {/* Rating */}

          <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">

            <label className="block text-sm font-bold text-slate-800">{t("Service Rating")}</label>

            <div
              className="mt-3 flex items-center gap-1"
              role="radiogroup"
              aria-label={t("Service rating")}
            >

              {[1, 2, 3, 4, 5].map((rating) => (

                <button
                  key={rating}
                  type="button"
                  className={`
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    text-2xl
                    transition-all
                    duration-200
                    hover:-translate-y-1
                    ${
                      Number(form.rating) >= rating
                        ? "text-amber-400 hover:bg-amber-100"
                        : "text-slate-300 hover:bg-white hover:text-amber-300"
                    }
                  `}
                  onClick={() =>
                    handleRatingChange(rating)
                  }
                  aria-label={t("{rating} out of 5 stars", { rating })}
                  aria-checked={
                    Number(form.rating) === rating
                  }
                  role="radio"
                >
                  ★
                </button>

              ))}

            </div>

            <div className="mt-2 text-sm font-semibold text-slate-600">

              {Number(form.rating) === 1 &&
                t("Very Poor")}

              {Number(form.rating) === 2 &&
                t("Poor")}

              {Number(form.rating) === 3 &&
                t("Average")}

              {Number(form.rating) === 4 &&
                t("Good")}

              {Number(form.rating) === 5 &&
                t("Excellent")}

            </div>

            <div className="mt-1 text-sm font-bold text-amber-600">
              {form.rating}/5
            </div>

          </div>

          {errors.rating && (
            <p className="-mt-2 mb-4 text-sm font-medium text-red-600">
              {errors.rating}
            </p>
          )}


          {/* Form Actions */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsFormOpen(false);
                setEditingFeedback(null);
                setErrors({});
              }}
            >{t("Cancel")}</Button>

            <Button type="submit">
              {editingFeedback
                ? t("Save Changes")
                : t("Submit Feedback")}
            </Button>

          </div>

        </form>

      </Modal>


      {/* Delete Confirmation */}

      <ConfirmDialog
        title={t("Delete Feedback?")}
        message={t("Are you sure you want to delete this feedback? This action cannot be undone.")}
        isOpen={isDeleteOpen}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteOpen(false);
          setSelectedFeedback(null);
        }}
        confirmText={t("Yes, Delete")}
        cancelText={t("Keep Feedback")}
      />

    </div>
  );
}

export default Feedback;