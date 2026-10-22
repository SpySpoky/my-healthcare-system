import { useState } from "react";
import PageHeader from "../../components/layout/PageHeader";
import BarList from "../../components/admin/BarList";
import ColumnChart from "../../components/admin/ColumnChart";
import { FilterSelect } from "../../components/admin/FilterBar";
import SectionCard from "../../components/admin/SectionCard";
import StatCard from "../../components/admin/StatCard";
import { useToast } from "../../context/useToast";
import {
  APPOINTMENT_STATUS_STATS,
  DEPARTMENT_STATS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  MONTHLY_STATS,
  USER_ROLES,
  USER_STATUSES,
  loadFeedback,
  loadUsers,
  logAdminActivity,
} from "../../data/adminData";

import { getLocale, lower, t } from "../../i18n";
const RANGE_OPTIONS = [
  { value: "3", label: t("Last 3 months") },
  { value: "6", label: t("Last 6 months") },
];

const statusBarClasses = {
  Completed: "bg-emerald-500",
  Upcoming: "bg-blue-500",
  Cancelled: "bg-red-400",
  Active: "bg-emerald-500",
  Inactive: "bg-slate-400",
  Suspended: "bg-red-400",
  Open: "bg-amber-400",
  "In Review": "bg-blue-500",
  Resolved: "bg-emerald-500",
  Closed: "bg-slate-400",
};

const toCsv = (rows) =>
  rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

function Reports() {
  const showToast = useToast();

  const [range, setRange] = useState("6");
  const [users] = useState(loadUsers);
  const [feedback] = useState(loadFeedback);



  const months = MONTHLY_STATS.slice(-Number(range));
  const totalAppointments = months.reduce(
    (sum, month) => sum + month.appointments,
    0
  );
  const totalRegistrations = months.reduce(
    (sum, month) => sum + month.registrations,
    0
  );

  const completedAppointments = APPOINTMENT_STATUS_STATS.find(
    (item) => item.label === "Completed"
  ).value;
  const allAppointments = APPOINTMENT_STATUS_STATS.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const completionRate = Math.round(
    (completedAppointments / allAppointments) * 100
  );

  const usersByRole = USER_ROLES.map((role) => ({
    label: role.label,
    value: users.filter((user) => user.role === role.value).length,
  }));

  const usersByStatus = USER_STATUSES.map((status) => ({
    label: status,
    value: users.filter((user) => user.status === status).length,
    barClass: statusBarClasses[status],
  }));

  const feedbackByType = FEEDBACK_TYPES.map((type) => ({
    label: type,
    value: feedback.filter((item) => item.type === type).length,
  }));

  const feedbackByStatus = FEEDBACK_STATUSES.map((status) => ({
    label: status,
    value: feedback.filter((item) => item.status === status).length,
    barClass: statusBarClasses[status],
  }));

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    label: rating === 1 ? t("1 star") : t("{rating} stars", { rating }),
    value: feedback.filter((item) => item.rating === rating).length,
    barClass: "bg-amber-400",
  }));

  const averageRating = feedback.length
    ? (
        feedback.reduce((sum, item) => sum + item.rating, 0) /
        feedback.length
      ).toFixed(1)
    : "0.0";

  const resolvedCount = feedback.filter(
    (item) => item.status === "Resolved" || item.status === "Closed"
  ).length;
  const resolutionRate = feedback.length
    ? Math.round((resolvedCount / feedback.length) * 100)
    : 0;

  const rangeLabel = RANGE_OPTIONS.find(
    (option) => option.value === range
  ).label;

  const handleExport = () => {
    const rows = [
      [t("Healthcare System Report"), rangeLabel],
      [],
      [t("Month"), t("Appointments"), t("Registrations"), t("Feedback")],
      ...months.map((month) => [
        month.month,
        month.appointments,
        month.registrations,
        month.feedback,
      ]),
      [],
      [t("Users by role"), t("Count")],
      ...usersByRole.map((item) => [item.label, item.value]),
      [],
      [t("Appointments by status"), t("Count")],
      ...APPOINTMENT_STATUS_STATS.map((item) => [item.label, item.value]),
      [],
      [t("Appointments by department"), t("Count")],
      ...DEPARTMENT_STATS.map((item) => [item.label, item.value]),
      [],
      [t("Feedback by type"), t("Count")],
      ...feedbackByType.map((item) => [item.label, item.value]),
      [],
      [t("Average rating"), averageRating],
      [t("Resolution rate"), `${resolutionRate}%`],
    ];

    const blob = new Blob([toCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `healthcare-report-${range}-months.csv`;
    link.click();
    URL.revokeObjectURL(url);

    logAdminActivity(`Exported report (${rangeLabel})`, "Reports");
    showToast(t("Report exported as CSV."));
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Administration")}
        title={t("Reports")}
        description={t("User, appointment and feedback statistics for the healthcare system.")}
        actions={
          <>
            <div className="rounded-2xl bg-white/95 px-3 py-2 text-slate-700">
              <FilterSelect
                label={t("Period")}
                value={range}
                onChange={setRange}
                options={RANGE_OPTIONS}
              />
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50"
            >{t("⬇ Export CSV")}</button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/20"
            >{t("🖨 Print")}</button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t("Appointments")}
          value={totalAppointments.toLocaleString(getLocale())}
          hint={rangeLabel}
          icon="📅"
        />
        <StatCard
          label={t("New Registrations")}
          value={totalRegistrations}
          hint={rangeLabel}
          icon="🆕"
          tone="violet"
        />
        <StatCard
          label={t("Completion Rate")}
          value={`${completionRate}%`}
          hint={t("Appointments completed")}
          icon="✅"
          tone="emerald"
        />
        <StatCard
          label={t("Feedback Resolved")}
          value={`${resolutionRate}%`}
          hint={t("Average rating {averageRating} / 5", { averageRating })}
          icon="💬"
          tone="amber"
        />
      </section>

      {/* USER STATISTICS */}

      <div>
        <h2 className="mb-4 text-xl font-black text-slate-900">{t("User Statistics")}</h2>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <SectionCard
            title={t("New Registrations")}
            description={t("Per month · {range}", { range: lower(rangeLabel) })}
          >
            <ColumnChart
              items={months.map((month) => ({
                label: month.month,
                value: month.registrations,
              }))}
              barClass="from-violet-500 to-purple-400"
            />
          </SectionCard>

          <SectionCard title={t("Users by Role")} description={t("All accounts")}>
            <BarList items={usersByRole} barClass="bg-blue-500" />
          </SectionCard>

          <SectionCard title={t("Account Status")} description={t("All accounts")}>
            <BarList items={usersByStatus} />
          </SectionCard>
        </div>
      </div>

      {/* APPOINTMENT STATISTICS */}

      <div>
        <h2 className="mb-4 text-xl font-black text-slate-900">{t("Appointment Statistics")}</h2>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <SectionCard
            title={t("Appointments per Month")}
            description={rangeLabel}
          >
            <ColumnChart
              items={months.map((month) => ({
                label: month.month,
                value: month.appointments,
              }))}
            />
          </SectionCard>

          <SectionCard title={t("By Status")} description={t("All time")}>
            <BarList
              items={APPOINTMENT_STATUS_STATS.map((item) => ({
                ...item,
                barClass: statusBarClasses[item.label],
              }))}
            />
          </SectionCard>

          <SectionCard title={t("By Department")} description={t("All time")}>
            <BarList items={DEPARTMENT_STATS} barClass="bg-sky-500" />
          </SectionCard>
        </div>
      </div>

      {/* FEEDBACK STATISTICS */}

      <div>
        <h2 className="mb-4 text-xl font-black text-slate-900">{t("Feedback Statistics")}</h2>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <SectionCard title={t("By Type")} description={t("All feedback")}>
            <BarList items={feedbackByType} barClass="bg-rose-400" />
          </SectionCard>

          <SectionCard title={t("By Status")} description={t("All feedback")}>
            <BarList items={feedbackByStatus} />
          </SectionCard>

          <SectionCard
            title={t("Rating Distribution")}
            description={t("Average {averageRating} / 5", { averageRating })}
          >
            <BarList items={ratingDistribution} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default Reports;
