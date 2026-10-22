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
import Pagination from "../../components/common/Pagination";
import {
  ACTIVITY_MODULES,
  ACTIVITY_STATUSES,
  USER_ROLES,
  formatTimestamp,
  getRoleLabel,
  loadActivity,
} from "../../data/adminData";

import { translateActivity } from "../../i18n/activity";
import { t } from "../../i18n";
const PAGE_SIZE = 10;

const statusDots = {
  Success: "bg-emerald-500",
  Warning: "bg-amber-500",
  Failed: "bg-red-500",
};

const toDateKey = (timestamp) => {
  const date = new Date(timestamp);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

function Activity() {

  const [activity, setActivity] = useState(loadActivity);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);



  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? t("The start date must be before the end date.")
      : "";

  const search = searchTerm.trim().toLowerCase();

  const filteredActivity = [...activity]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .filter((entry) => {
      const dateKey = toDateKey(entry.timestamp);

      const matchesSearch =
        !search ||
        [entry.id, entry.user, entry.action, entry.ip]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return (
        matchesSearch &&
        (moduleFilter === "All" || entry.module === moduleFilter) &&
        (statusFilter === "All" || entry.status === statusFilter) &&
        (roleFilter === "All" || entry.role === roleFilter) &&
        (dateRangeError ||
          ((!fromDate || dateKey >= fromDate) &&
            (!toDate || dateKey <= toDate)))
      );
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredActivity.length / PAGE_SIZE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageEntries = filteredActivity.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const hasFilters =
    Boolean(searchTerm) ||
    moduleFilter !== "All" ||
    statusFilter !== "All" ||
    roleFilter !== "All" ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setModuleFilter("All");
    setStatusFilter("All");
    setRoleFilter("All");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const latestDate = activity.length
    ? toDateKey(
        activity.reduce((latest, entry) =>
          new Date(entry.timestamp) > new Date(latest.timestamp)
            ? entry
            : latest
        ).timestamp
      )
    : "";

  const countStatus = (status) =>
    activity.filter((entry) => entry.status === status).length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Administration")}
        title={t("Activity Monitoring")}
        description={t("Track sign-ins, record changes and administrator actions across the system, and spot failed or suspicious activity.")}
        actions={
          <button
            type="button"
            onClick={() => setActivity(loadActivity())}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50"
          >{t("↻ Refresh")}</button>
        }
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t("Total Events")}
          value={activity.length}
          icon="📋"
        />
        <StatCard
          label={t("Latest Day")}
          value={
            activity.filter(
              (entry) => toDateKey(entry.timestamp) === latestDate
            ).length
          }
          hint={t("Events on the most recent day")}
          icon="🕒"
          tone="violet"
        />
        <StatCard
          label={t("Warnings")}
          value={countStatus("Warning")}
          icon="⚠️"
          tone="amber"
        />
        <StatCard
          label={t("Failed")}
          value={countStatus("Failed")}
          hint={t("Includes failed sign-in attempts")}
          icon="⛔"
          tone="rose"
        />
      </section>

      {/* FILTERS (W84) */}

      <div className="space-y-3">
        <FilterBar onClear={clearFilters} canClear={hasFilters}>
          <SearchInput
            value={searchTerm}
            onChange={updateFilter(setSearchTerm)}
            placeholder={t("Search by user, action, IP or ID")}
          />

          <FilterSelect
            label={t("Module")}
            value={moduleFilter}
            onChange={updateFilter(setModuleFilter)}
            options={["All", ...ACTIVITY_MODULES]}
          />

          <FilterSelect
            label={t("Status")}
            value={statusFilter}
            onChange={updateFilter(setStatusFilter)}
            options={["All", ...ACTIVITY_STATUSES]}
          />

          <FilterSelect
            label={t("Role")}
            value={roleFilter}
            onChange={updateFilter(setRoleFilter)}
            options={[{ value: "All", label: t("All roles") }, ...USER_ROLES]}
          />

          <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">{t("From")}<input
              type="date"
              value={fromDate}
              onChange={(event) =>
                updateFilter(setFromDate)(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">{t("To")}<input
              type="date"
              value={toDate}
              onChange={(event) =>
                updateFilter(setToDate)(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
        </FilterBar>

        {dateRangeError && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >{t("{dateRangeError} The date filter is ignored until it is fixed.", { dateRangeError })}</p>
        )}
      </div>

      {/* LOG TABLE (W84) */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">{t("Activity Log")}</h2>

          <p className="text-sm font-semibold text-slate-500">{t("{length} matching events", { length: filteredActivity.length })}</p>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="🔍"
              title={t("No activity found")}
              message={t("No events match the selected filters.")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">{t("Time")}</th>
                  <th className="px-4 py-3">{t("User")}</th>
                  <th className="px-4 py-3">{t("Action")}</th>
                  <th className="px-4 py-3">{t("Module")}</th>
                  <th className="px-4 py-3">{t("IP Address")}</th>
                  <th className="px-6 py-3">{t("Status")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pageEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      entry.status === "Failed" ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            statusDots[entry.status] || "bg-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="text-slate-600">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">
                        {t(entry.user)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.role === "—"
                          ? t("Not signed in")
                          : getRoleLabel(entry.role)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {translateActivity(entry.action)}
                      <span className="block text-xs text-slate-400">
                        {entry.id}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {t(entry.module)}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">
                      {entry.ip}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(entry.status)}>
                        {t(entry.status)}
                      </Badge>
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
    </div>
  );
}

export default Activity;
