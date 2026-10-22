import { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import DetailRow from "../../components/common/DetailRow";
import FilterBar, {
  FilterSelect,
  SearchInput,
} from "../../components/admin/FilterBar";
import { getStatusVariant } from "../../components/admin/statusVariants";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import Button from "../../components/forms/Button";
import Textarea from "../../components/forms/Textarea";
import { useToast } from "../../context/useToast";
import {
  ADMIN_STORAGE_KEYS,
  CURRENT_ADMIN,
  formatTodayShort,
  getNextUserId,
  getRoleLabel,
  loadApplications,
  loadUsers,
  logAdminActivity,
  saveStored,
} from "../../data/adminData";
import { useStoredState } from "../../hooks/useStoredState";

import { t } from "../../i18n";
import { localDate } from "../../utils/date";
const TABS = ["Pending", "Approved", "Rejected"];

const MIN_REJECTION_REASON = 10;


function Applications() {
  const showToast = useToast();

  const [applications, setApplications] = useStoredState(
    ADMIN_STORAGE_KEYS.applications,
    loadApplications
  );

  const [activeTab, setActiveTab] = useState("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [selectedId, setSelectedId] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewError, setReviewError] = useState("");



  const search = searchTerm.trim().toLowerCase();

  const filteredApplications = applications.filter((application) => {
    const matchesTab = application.status === activeTab;
    const matchesRole =
      roleFilter === "All" || application.role === roleFilter;
    const matchesSearch =
      !search ||
      [
        application.id,
        application.name,
        application.email,
        application.department,
        application.licenseNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);

    return matchesTab && matchesRole && matchesSearch;
  });

  const selectedApplication = applications.find(
    (application) => application.id === selectedId
  );

  const countFor = (status) =>
    applications.filter((application) => application.status === status)
      .length;

  const openDetails = (application) => {
    setSelectedId(application.id);
    setReviewNote("");
    setReviewError("");
  };

  const closeDetails = () => {
    setSelectedId(null);
    setDecision(null);
  };

  const requestDecision = (type) => {
    if (type === "Rejected") {
      const note = reviewNote.trim();

      if (note.length < MIN_REJECTION_REASON) {
        setReviewError(
          t("Please give a reason for rejection (at least {MIN_REJECTION_REASON} characters).", { MIN_REJECTION_REASON })
        );
        return;
      }
    }

    setReviewError("");
    setDecision(type);
  };

  const confirmDecision = () => {
    const application = selectedApplication;
    const note =
      reviewNote.trim() ||
      (decision === "Approved" ? t("Approved after document review.") : "");

    setApplications((previous) =>
      previous.map((item) =>
        item.id === application.id
          ? {
              ...item,
              status: decision,
              reviewNote: note,
              reviewedAt: formatTodayShort(),
              reviewedBy: CURRENT_ADMIN,
            }
          : item
      )
    );

    // An approved applicant becomes an active user account.
    if (decision === "Approved") {
      const users = loadUsers();

      if (
        !users.some(
          (user) =>
            user.email.toLowerCase() === application.email.toLowerCase()
        )
      ) {
        saveStored(ADMIN_STORAGE_KEYS.users, [
          ...users,
          {
            id: getNextUserId(users),
            name: application.name,
            email: application.email,
            phone: application.phone,
            role: application.role,
            department: application.department,
            status: "Active",
            joined: formatTodayShort(),
            lastLogin: "Never",
          },
        ]);
      }
    }

    logAdminActivity(
      `${decision === "Approved" ? "Approved" : "Rejected"} application ${application.id} (${application.name})`,
      "Applications"
    );

    showToast(
      decision === "Approved"
        ? t("{name} was approved and a user account was created.", { name: application.name })
        : t("{name}'s application was rejected.", { name: application.name }),
      decision === "Approved" ? "success" : "info"
    );

    setActiveTab(decision);
    closeDetails();
  };

  const hasFilters = Boolean(searchTerm) || roleFilter !== "All";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Administration")}
        title={t("Application Approval")}
        description={t("Review registration requests from doctors and medical staff. Approved applicants receive an active user account.")}
      />

      {/* STATUS TABS (W76) */}

      <div
        role="tablist"
        aria-label={t("Application status")}
        className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm"
      >
        {TABS.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {t(tab)}

              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {countFor(tab)}
              </span>
            </button>
          );
        })}
      </div>

      <FilterBar
        onClear={() => {
          setSearchTerm("");
          setRoleFilter("All");
        }}
        canClear={hasFilters}
      >
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("Search by name, email, department or license")}
        />

        <FilterSelect
          label={t("Applying as")}
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: "All", label: t("All roles") },
            { value: "doctor", label: t("Doctor") },
            { value: "medical_staff", label: t("Medical Staff") },
          ]}
        />
      </FilterBar>

      {/* APPLICATION LIST */}

      {filteredApplications.length === 0 ? (
        <EmptyState
          icon={activeTab === "Pending" ? "✅" : "📂"}
          title={
            hasFilters
              ? t("No applications match your filters")
              : {
                  Pending: t("No pending applications"),
                  Approved: t("No approved applications"),
                  Rejected: t("No rejected applications"),
                }[activeTab]
          }
          message={
            hasFilters
              ? t("Try a different search term or clear the filters.")
              : activeTab === "Pending"
                ? t("All applications have been reviewed.")
                : t("Applications will appear here once reviewed.")
          }
        />
      ) : (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredApplications.map((application) => (
            <article
              key={application.id}
              className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <Avatar name={application.name} />

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black text-slate-900">
                    {application.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {getRoleLabel(application.role)} ·{" "}
                    {t(application.department)}
                  </p>
                </div>

                <Badge variant={getStatusVariant(application.status)}>
                  {t(application.status)}
                </Badge>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-bold text-slate-400">{t("Application")}</dt>
                  <dd className="font-semibold text-slate-700">
                    {application.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-400">{t("Experience")}</dt>
                  <dd className="font-semibold text-slate-700">
                    {application.experience === 1 ? t("1 year") : t("{count} years", { count: application.experience })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-400">{t("Submitted")}</dt>
                  <dd className="font-semibold text-slate-700">
                    {localDate(application.submittedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-400">{t("Documents")}</dt>
                  <dd className="font-semibold text-slate-700">{t("{length} attached", { length: application.documents.length })}</dd>
                </div>
              </dl>

              {application.reviewNote && (
                <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <span className="font-bold">
                    {application.reviewedBy} · {localDate(application.reviewedAt)}:
                  </span>{" "}
                  {application.reviewNote}
                </p>
              )}

              <div className="mt-auto pt-5">
                <Button
                  variant={
                    application.status === "Pending" ? "primary" : "secondary"
                  }
                  onClick={() => openDetails(application)}
                >
                  {application.status === "Pending"
                    ? t("Review Application")
                    : t("View Details")}
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* DETAIL VIEW (W77) */}

      <Modal
        title={t("Application {id}", { id: selectedApplication?.id || "" })}
        isOpen={Boolean(selectedApplication)}
        onClose={closeDetails}
      >
        {selectedApplication && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={selectedApplication.name} size="large" />

              <div className="min-w-0">
                <h3 className="text-xl font-black text-slate-900">
                  {selectedApplication.name}
                </h3>
                <p className="text-sm text-slate-500">{t("Applying as")} {getRoleLabel(selectedApplication.role)} ·{" "}
                  {t(selectedApplication.department)}
                </p>
              </div>

              <div className="ml-auto">
                <Badge
                  variant={getStatusVariant(selectedApplication.status)}
                >
                  {t(selectedApplication.status)}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow label={t("Email")} value={selectedApplication.email} />
              <DetailRow label={t("Phone")} value={selectedApplication.phone} />
              <DetailRow
                label={t("License number")}
                value={selectedApplication.licenseNumber}
              />
              <DetailRow
                label={t("Experience")}
                value={selectedApplication.experience === 1 ? t("1 year") : t("{count} years", { count: selectedApplication.experience })}
              />
              <DetailRow
                label={t("Submitted")}
                value={localDate(selectedApplication.submittedAt)}
              />
              <DetailRow
                label={t("Department")}
                value={selectedApplication.department}
              />
            </dl>

            <dl>
              <DetailRow
                label={t("Qualification")}
                value={selectedApplication.qualification}
              />
            </dl>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("Submitted documents")}</h4>

              <ul className="flex flex-wrap gap-2">
                {selectedApplication.documents.map((document) => (
                  <li
                    key={document}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    📄 {t(document)}
                  </li>
                ))}
              </ul>
            </div>

            {selectedApplication.status === "Pending" ? (
              <div className="border-t border-slate-100 pt-5">
                <Textarea
                  label={t("Review note (required when rejecting)")}
                  name="reviewNote"
                  value={reviewNote}
                  onChange={(event) => {
                    setReviewNote(event.target.value);
                    setReviewError("");
                  }}
                  placeholder={t("Add a note for the applicant or other administrators")}
                />

                {reviewError && (
                  <p
                    role="alert"
                    className="-mt-3 mb-4 text-xs font-semibold text-red-600"
                  >
                    {reviewError}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={closeDetails}>{t("Cancel")}</Button>

                  <Button
                    variant="danger"
                    onClick={() => requestDecision("Rejected")}
                  >{t("Reject")}</Button>

                  <Button
                    variant="success"
                    onClick={() => requestDecision("Approved")}
                  >{t("Approve")}</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-bold text-slate-800">{t("{status} by {reviewedBy} on {reviewedAt}", { status: t(selectedApplication.status), reviewedBy: selectedApplication.reviewedBy, reviewedAt: localDate(selectedApplication.reviewedAt) })}</p>

                {selectedApplication.reviewNote && (
                  <p className="mt-1">{selectedApplication.reviewNote}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(decision)}
        title={
          decision === "Approved"
            ? t("Approve application?")
            : t("Reject application?")
        }
        message={
          decision === "Approved"
            ? t("{name} will get an active {role} account.", {
                name: selectedApplication?.name,
                role: getRoleLabel(selectedApplication?.role),
              })
            : t("{name} will be notified that the application was rejected.", { name: selectedApplication?.name })
        }
        confirmText={decision === "Approved" ? t("Approve") : t("Reject")}
        variant={decision === "Approved" ? "success" : "danger"}
        onConfirm={confirmDecision}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
}

export default Applications;
