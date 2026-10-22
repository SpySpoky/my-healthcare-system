import { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import FilterBar, {
  FilterSelect,
  SearchInput,
} from "../../components/admin/FilterBar";
import StatCard from "../../components/admin/StatCard";
import { getStatusVariant } from "../../components/admin/statusVariants";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/forms/Button";
import { useToast } from "../../context/useToast";
import {
  ADMIN_STORAGE_KEYS,
  CURRENT_ADMIN,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  formatTodayShort,
  loadFeedback,
  logAdminActivity,
} from "../../data/adminData";
import { useStoredState } from "../../hooks/useStoredState";

import { lower, t } from "../../i18n";
import { localDate } from "../../utils/date";
const MIN_RESPONSE_LENGTH = 10;
const MAX_RESPONSE_LENGTH = 1000;

const typeIcons = {
  Feedback: "💬",
  Complaint: "⚠️",
  Suggestion: "💡",
};

function Stars({ rating }) {
  return (
    <span
      className="text-sm tracking-wide text-amber-400"
      aria-label={t("{rating} out of 5 stars", { rating })}
    >
      {"★".repeat(rating)}
      <span className="text-slate-200">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function FeedbackManagement() {
  const showToast = useToast();

  const [feedback, setFeedback] = useStoredState(
    ADMIN_STORAGE_KEYS.feedback,
    loadFeedback
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    status: "",
    priority: "",
    response: "",
  });
  const [formError, setFormError] = useState("");



  const search = searchTerm.trim().toLowerCase();

  const filteredFeedback = feedback.filter((item) => {
    const matchesSearch =
      !search ||
      [
        item.id,
        item.patient,
        item.subject,
        item.message,
        item.doctor,
        item.department,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);

    return (
      matchesSearch &&
      (typeFilter === "All" || item.type === typeFilter) &&
      (statusFilter === "All" || item.status === statusFilter) &&
      (priorityFilter === "All" || item.priority === priorityFilter)
    );
  });

  const selected = feedback.find((item) => item.id === selectedId);

  const hasFilters =
    Boolean(searchTerm) ||
    typeFilter !== "All" ||
    statusFilter !== "All" ||
    priorityFilter !== "All";

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("All");
    setStatusFilter("All");
    setPriorityFilter("All");
  };

  const selectFeedback = (item) => {
    setSelectedId(item.id);
    setForm({
      status: item.status,
      priority: item.priority,
      response: item.response || "",
    });
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setFormError("");
  };

  const handleSave = (event) => {
    event.preventDefault();

    const response = form.response.trim();
    const isClosing =
      form.status === "Resolved" || form.status === "Closed";

    if (response && response.length < MIN_RESPONSE_LENGTH) {
      setFormError(
        t("The response must be at least {MIN_RESPONSE_LENGTH} characters.", { MIN_RESPONSE_LENGTH })
      );
      return;
    }

    if (response.length > MAX_RESPONSE_LENGTH) {
      setFormError(
        t("The response cannot be longer than {MAX_RESPONSE_LENGTH} characters.", { MAX_RESPONSE_LENGTH })
      );
      return;
    }

    if (isClosing && !response) {
      setFormError(
        t("Write a response to the patient before marking this as {status}.", {
          status: lower(t(form.status)),
        })
      );
      return;
    }

    const responseChanged = response !== (selected.response || "");

    if (
      !responseChanged &&
      form.status === selected.status &&
      form.priority === selected.priority
    ) {
      setFormError(t("There are no changes to save."));
      return;
    }

    setFeedback((previous) =>
      previous.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              status: form.status,
              priority: form.priority,
              ...(responseChanged && {
                response,
                respondedAt: formatTodayShort(),
                respondedBy: CURRENT_ADMIN,
              }),
            }
          : item
      )
    );

    logAdminActivity(
      responseChanged
        ? `Responded to feedback ${selected.id}`
        : `Updated feedback ${selected.id} status to ${form.status}`,
      "Feedback"
    );

    showToast(
      responseChanged
        ? t("Response saved and sent to the patient.")
        : t("Feedback updated.")
    );
  };

  const countWhere = (predicate) => feedback.filter(predicate).length;
  const averageRating = feedback.length
    ? (
        feedback.reduce((sum, item) => sum + item.rating, 0) /
        feedback.length
      ).toFixed(1)
    : "0.0";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Administration")}
        title={t("Feedback Management")}
        description={t("Review patient feedback, complaints and suggestions, respond to patients and track each item until it is resolved.")}
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t("Open")}
          value={countWhere((item) => item.status === "Open")}
          icon="📬"
          tone="amber"
        />
        <StatCard
          label={t("In Review")}
          value={countWhere((item) => item.status === "In Review")}
          icon="🔎"
          tone="blue"
        />
        <StatCard
          label={t("Complaints")}
          value={countWhere((item) => item.type === "Complaint")}
          icon="⚠️"
          tone="rose"
        />
        <StatCard
          label={t("Average Rating")}
          value={`${averageRating} / 5`}
          icon="⭐"
          tone="emerald"
        />
      </section>

      {/* FILTERS (W79) */}

      <FilterBar onClear={clearFilters} canClear={hasFilters}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("Search by patient, subject, doctor or ID")}
        />

        <FilterSelect
          label={t("Type")}
          value={typeFilter}
          onChange={setTypeFilter}
          options={["All", ...FEEDBACK_TYPES]}
        />

        <FilterSelect
          label={t("Status")}
          value={statusFilter}
          onChange={setStatusFilter}
          options={["All", ...FEEDBACK_STATUSES]}
        />

        <FilterSelect
          label={t("Priority")}
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={["All", ...FEEDBACK_PRIORITIES]}
        />
      </FilterBar>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* LIST (W79) */}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black text-slate-900">{t("Inbox")}</h2>
            <span className="text-sm font-semibold text-slate-500">{t("{length} items", { length: filteredFeedback.length })}</span>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="🔍"
                title={t("No feedback found")}
                message={t("No feedback matches the selected filters.")}
              />
            </div>
          ) : (
            <ul className="max-h-[720px] divide-y divide-slate-100 overflow-y-auto">
              {filteredFeedback.map((item) => {
                const isSelected = item.id === selectedId;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectFeedback(item)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full px-6 py-4 text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-lg">
                          {typeIcons[item.type]}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate font-bold text-slate-800">
                              {item.subject}
                            </p>
                            <span className="shrink-0 text-xs text-slate-400">
                              {localDate(item.submittedAt)}
                            </span>
                          </div>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {item.id} · {item.patient} · {t(item.type)}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={getStatusVariant(item.status)}>
                              {t(item.status)}
                            </Badge>
                            <Badge variant={getStatusVariant(item.priority)}>
                              {t(item.priority)}
                            </Badge>
                            <Stars rating={item.rating} />
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* DETAIL PANEL (W79) + RESPONSE (W80) */}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
          {!selected ? (
            <div className="p-6">
              <EmptyState
                icon="👈"
                title={t("Select a feedback item")}
                message={t("Choose an item from the inbox to read it and respond.")}
              />
            </div>
          ) : (
            <div>
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                      {t(selected.type)} · {selected.id}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">
                      {selected.subject}
                    </h2>
                  </div>

                  <Badge variant={getStatusVariant(selected.status)}>
                    {t(selected.status)}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs font-bold text-slate-400">{t("Patient")}</dt>
                    <dd className="font-semibold text-slate-700">
                      {selected.patient}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400">{t("Doctor")}</dt>
                    <dd className="font-semibold text-slate-700">
                      {selected.doctor}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400">{t("Department")}</dt>
                    <dd className="font-semibold text-slate-700">
                      {t(selected.department)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400">{t("Rating")}</dt>
                    <dd>
                      <Stars rating={selected.rating} />
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("Patient message · {submittedAt}", { submittedAt: localDate(selected.submittedAt) })}</h3>
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {selected.message}
                  </p>
                </div>

                {selected.response && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("Current response · {respondedBy} · {respondedAt}", { respondedBy: selected.respondedBy, respondedAt: localDate(selected.respondedAt) })}</h3>
                    <p className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-7 text-slate-700">
                      {selected.response}
                    </p>
                  </div>
                )}

                <form
                  onSubmit={handleSave}
                  noValidate
                  className="space-y-4 border-t border-slate-100 pt-6"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">{t("Status")}<select
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        {FEEDBACK_STATUSES.map((status) => (
                          <option key={status}>{t(status)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">{t("Priority")}<select
                        name="priority"
                        value={form.priority}
                        onChange={handleFormChange}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        {FEEDBACK_PRIORITIES.map((priority) => (
                          <option key={priority}>{t(priority)}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
                    {selected.response ? t("Update response") : t("Response to patient")}
                    <textarea
                      name="response"
                      rows={5}
                      value={form.response}
                      onChange={handleFormChange}
                      maxLength={MAX_RESPONSE_LENGTH}
                      placeholder={t("Write a reply that the patient will see on their feedback page")}
                      className="resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <span className="self-end text-xs font-normal text-slate-400">
                      {form.response.length} / {MAX_RESPONSE_LENGTH}
                    </span>
                  </label>

                  {formError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedId(null)}
                    >{t("Close")}</Button>

                    <Button type="submit">{t("Save Changes")}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default FeedbackManagement;
