import { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import DetailRow from "../../components/common/DetailRow";
import FilterBar, {
  FilterSelect,
  SearchInput,
} from "../../components/admin/FilterBar";
import StatCard from "../../components/admin/StatCard";
import { getStatusVariant } from "../../components/admin/statusVariants";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import Button from "../../components/forms/Button";
import Input from "../../components/forms/Input";
import Select from "../../components/forms/Select";
import { useToast } from "../../context/useToast";
import {
  ADMIN_STORAGE_KEYS,
  USER_ROLES,
  USER_STATUSES,
  getRoleLabel,
  loadUsers,
  logAdminActivity,
} from "../../data/adminData";
import { useStoredState } from "../../hooks/useStoredState";
import { ALL_DEPARTMENTS } from "../../data/doctorsData";
import { getPatientByEmail, updatePatient } from "../../data/patientsData";

// Patient accounts mirror their patient record (name, contact, status).
const syncPatientRecord = (previousEmail, account) => {
  const patient = getPatientByEmail(previousEmail);

  if (patient) {
    updatePatient(patient.id, {
      name: account.name,
      email: account.email,
      phone: account.phone,
      status: account.status === "Active" ? "Active" : "Inactive",
    });
  }
};
import { useAuth } from "../../context/useAuth";

import { lower, t } from "../../i18n";
import { localDate } from "../../utils/date";
const PAGE_SIZE = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9 ]{10,16}$/;



function Users() {
  const showToast = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useStoredState(
    ADMIN_STORAGE_KEYS.users,
    loadUsers
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [statusChange, setStatusChange] = useState(null);



  const search = searchTerm.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !search ||
      [
        user.name,
        user.email,
        user.phone,
        user.id,
        user.department,
        getRoleLabel(user.role),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);

    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "All" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / PAGE_SIZE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageUsers = filteredUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const hasFilters =
    Boolean(searchTerm) || roleFilter !== "All" || statusFilter !== "All";

  const updateFilter = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("All");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  const isCurrentAdmin = (user) =>
    currentUser?.email &&
    user.email.toLowerCase() === currentUser.email.toLowerCase();

  /* ---------- Edit ---------- */

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department === "—" ? "" : user.department,
      status: user.status,
    });
    setEditErrors({});
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({ ...previous, [name]: value }));

    if (editErrors[name]) {
      setEditErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const validateEdit = () => {
    const errors = {};
    const email = editForm.email.trim().toLowerCase();

    if (editForm.name.trim().length < 3) {
      errors.name = t("Name must be at least 3 characters.");
    }

    if (!EMAIL_PATTERN.test(email)) {
      errors.email = t("Enter a valid email address.");
    } else if (
      users.some(
        (user) =>
          user.id !== editingUser.id && user.email.toLowerCase() === email
      )
    ) {
      errors.email = t("Another account already uses this email.");
    }

    if (!PHONE_PATTERN.test(editForm.phone.trim())) {
      errors.phone = t("Enter a valid phone number (10–16 digits).");
    }

    if (!editForm.role) {
      errors.role = t("Select a role.");
    }

    if (
      ["doctor", "medical_staff"].includes(editForm.role) &&
      !editForm.department.trim()
    ) {
      errors.department = t("Department is required for medical staff.");
    }

    if (!editForm.status) {
      errors.status = t("Select a status.");
    } else if (
      isCurrentAdmin(editingUser) &&
      editForm.status !== "Active"
    ) {
      errors.status = t("You cannot deactivate your own account.");
    }

    setEditErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!validateEdit()) {
      return;
    }

    setUsers((previous) =>
      previous.map((user) =>
        user.id === editingUser.id
          ? {
              ...user,
              name: editForm.name.trim(),
              email: editForm.email.trim(),
              phone: editForm.phone.trim(),
              role: editForm.role,
              department: editForm.department.trim() || "—",
              status: editForm.status,
            }
          : user
      )
    );

    if (editingUser.role === "patient") {
      syncPatientRecord(editingUser.email, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        status: editForm.status,
      });
    }

    logAdminActivity(
      `Updated user ${editingUser.id} (${editForm.name.trim()})`,
      "Users"
    );
    showToast(t("{name} was updated.", { name: editForm.name.trim() }));
    setEditingUser(null);
  };

  /* ---------- Status ---------- */

  const requestStatusChange = (user, status) => {
    if (isCurrentAdmin(user)) {
      showToast(t("You cannot change the status of your own account."), "error");
      return;
    }

    setStatusChange({ user, status });
  };

  const confirmStatusChange = () => {
    const { user, status } = statusChange;

    setUsers((previous) =>
      previous.map((item) =>
        item.id === user.id ? { ...item, status } : item
      )
    );

    if (user.role === "patient") {
      syncPatientRecord(user.email, { ...user, status });
    }

    logAdminActivity(
      `Changed status of ${user.id} (${user.name}) to ${status}`,
      "Users"
    );
    showToast(t("{name} is now {status}.", { name: user.name, status: lower(t(status)) }));
    setStatusChange(null);
  };

  const roleOptions = [
    { value: "All", label: t("All roles") },
    ...USER_ROLES,
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Administration")}
        title={t("User Management")}
        description={t("Search all patient, doctor, medical staff and administrator accounts, update their details and control account access.")}
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={t("All Users")} value={users.length} icon="👥" />
        <StatCard
          label={t("Active")}
          value={users.filter((user) => user.status === "Active").length}
          icon="✅"
          tone="emerald"
        />
        <StatCard
          label={t("Inactive")}
          value={users.filter((user) => user.status === "Inactive").length}
          icon="⏸️"
          tone="amber"
        />
        <StatCard
          label={t("Suspended")}
          value={users.filter((user) => user.status === "Suspended").length}
          icon="⛔"
          tone="rose"
        />
      </section>

      {/* FILTERS (W73) */}

      <FilterBar onClear={clearFilters} canClear={hasFilters}>
        <SearchInput
          value={searchTerm}
          onChange={updateFilter(setSearchTerm)}
          placeholder={t("Search by name, email, phone or ID")}
        />

        <FilterSelect
          label={t("Role")}
          value={roleFilter}
          onChange={updateFilter(setRoleFilter)}
          options={roleOptions}
        />

        <FilterSelect
          label={t("Status")}
          value={statusFilter}
          onChange={updateFilter(setStatusFilter)}
          options={["All", ...USER_STATUSES]}
        />
      </FilterBar>

      {/* TABLE (W73) */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">{t("Accounts")}</h2>

          <p className="text-sm font-semibold text-slate-500">{t("Showing {length} of {length2} users", { length: pageUsers.length, length2: filteredUsers.length })}</p>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="🔍"
              title={t("No users match your filters")}
              message={t("Try a different search term or clear the filters.")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">{t("User")}</th>
                  <th className="px-4 py-3">{t("Role")}</th>
                  <th className="px-4 py-3">{t("Department")}</th>
                  <th className="px-4 py-3">{t("Joined")}</th>
                  <th className="px-4 py-3">{t("Last Login")}</th>
                  <th className="px-4 py-3">{t("Status")}</th>
                  <th className="px-6 py-3 text-right">{t("Actions")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pageUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-blue-50/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="small" />

                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">
                            {user.name}
                            {isCurrentAdmin(user) && (
                              <span className="ml-2 text-xs font-semibold text-blue-600">{t("(you)")}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.id} · {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {getRoleLabel(user.role)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {t(user.department)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {localDate(user.joined)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {localDate(user.lastLogin)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={getStatusVariant(user.status)}>
                        {t(user.status)}
                      </Badge>
                    </td>

                    {/* ACTIONS (W74) */}

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingUser(user)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >{t("View")}</button>

                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
                        >{t("Edit")}</button>

                        {user.status === "Active" ? (
                          <button
                            type="button"
                            onClick={() =>
                              requestStatusChange(user, "Inactive")
                            }
                            disabled={isCurrentAdmin(user)}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          >{t("Deactivate")}</button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              requestStatusChange(user, "Active")
                            }
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                          >{t("Activate")}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-4">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>

      {/* VIEW MODAL */}

      <Modal
        title={t("User Details")}
        isOpen={Boolean(viewingUser)}
        onClose={() => setViewingUser(null)}
      >
        {viewingUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={viewingUser.name} size="large" />

              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {viewingUser.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {viewingUser.id} · {getRoleLabel(viewingUser.role)}
                </p>
              </div>

              <div className="ml-auto">
                <Badge variant={getStatusVariant(viewingUser.status)}>
                  {t(viewingUser.status)}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow label={t("Email")} value={viewingUser.email} />
              <DetailRow label={t("Phone")} value={viewingUser.phone} />
              <DetailRow label={t("Department")} value={viewingUser.department} />
              <DetailRow label={t("Joined")} value={localDate(viewingUser.joined)} />
              <DetailRow label={t("Last login")} value={localDate(viewingUser.lastLogin)} />
              <DetailRow
                label={t("Role")}
                value={getRoleLabel(viewingUser.role)}
              />
            </dl>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setViewingUser(null)}
              >{t("Close")}</Button>

              <Button
                onClick={() => {
                  const user = viewingUser;
                  setViewingUser(null);
                  openEdit(user);
                }}
              >{t("Edit User")}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}

      <Modal
        title={t("Edit {name}", { name: editingUser?.name || t("User") })}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
      >
        {editingUser && (
          <form onSubmit={handleEditSubmit} noValidate>
            <Input
              label={t("Full name")}
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              required
              error={editErrors.name}
            />

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <div>
                <Input
                  label={t("Email")}
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  required
                  error={editErrors.email}
                />
              </div>

              <div>
                <Input
                  label={t("Phone")}
                  name="phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  required
                  error={editErrors.phone}
                />
              </div>

              <div>
                <Select
                  label={t("Role")}
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  options={USER_ROLES}
                  required
                  error={editErrors.role}
                />
              </div>

              <div>
                <Select
                  label={t("Status")}
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                  options={USER_STATUSES.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                  required
                  error={editErrors.status}
                />
              </div>
            </div>

            <Input
              label={t("Department")}
              name="department"
              value={editForm.department}
              onChange={handleEditChange}
              placeholder={t("Choose or type a department")}
              list="department-suggestions"
              required={["doctor", "medical_staff"].includes(editForm.role)}
              error={editErrors.department}
            />

            {/* Departments from the database; a new name creates one. */}
            <datalist id="department-suggestions">
              {ALL_DEPARTMENTS.map((department) => (
                <option key={department} value={department} />
              ))}
            </datalist>

            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setEditingUser(null)}
              >{t("Cancel")}</Button>

              <Button type="submit">{t("Save Changes")}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* STATUS CONFIRMATION */}

      <ConfirmDialog
        isOpen={Boolean(statusChange)}
        title={
          statusChange?.status === "Active"
            ? t("Activate account?")
            : t("Deactivate account?")
        }
        message={
          statusChange?.status === "Active"
            ? t("{name} will be able to sign in again.", { name: statusChange?.user.name })
            : t("{name} will no longer be able to sign in until the account is reactivated.", { name: statusChange?.user.name })
        }
        confirmText={
          statusChange?.status === "Active" ? t("Activate") : t("Deactivate")
        }
        variant={statusChange?.status === "Active" ? "success" : "danger"}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusChange(null)}
      />
    </div>
  );
}

export default Users;
