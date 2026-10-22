import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/admin/StatCard";
import BarList from "../../components/admin/BarList";
import ColumnChart from "../../components/admin/ColumnChart";
import SectionCard from "../../components/admin/SectionCard";
import { getStatusVariant } from "../../components/admin/statusVariants";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import {
  MONTHLY_STATS,
  USER_ROLES,
  formatTimestamp,
  getRoleLabel,
  loadActivity,
  loadApplications,
  loadFeedback,
  loadUsers,
} from "../../data/adminData";

import { translateActivity } from "../../i18n/activity";
import { t } from "../../i18n";
import { localDate } from "../../utils/date";
const roleBarClasses = {
  patient: "bg-cyan-500",
  doctor: "bg-indigo-500",
  medical_staff: "bg-violet-500",
  admin: "bg-blue-500",
};

const quickActions = [
  {
    title: t("Manage Users"),
    description: t("View, edit and change account status"),
    icon: "👥",
    to: "/admin/users",
  },
  {
    title: t("Review Applications"),
    description: t("Approve or reject staff registrations"),
    icon: "📝",
    to: "/admin/applications",
  },
  {
    title: t("Respond to Feedback"),
    description: t("Handle patient feedback and complaints"),
    icon: "💬",
    to: "/admin/feedback",
  },
  {
    title: t("View Reports"),
    description: t("System usage and statistics"),
    icon: "📊",
    to: "/admin/reports",
  },
];

function ViewAllLink({ to, children = t("View all") }) {
  return (
    <Link
      to={to}
      className="rounded-xl px-3 py-2 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50"
    >
      {children} →
    </Link>
  );
}

function AdminDashboard() {

  // Read once per visit so the dashboard reflects changes
  // made on the other admin pages.
  const [users] = useState(loadUsers);
  const [applications] = useState(loadApplications);
  const [feedback] = useState(loadFeedback);
  const [activity] = useState(loadActivity);



  const activeUsers = users.filter((user) => user.status === "Active");
  const pendingApplications = applications.filter(
    (application) => application.status === "Pending"
  );
  const openFeedback = feedback.filter(
    (item) => item.status === "Open" || item.status === "In Review"
  );
  // Real data can be empty (a new system) or have no appointments last month.
  const emptyMonth = { month: "—", appointments: 0 };
  const currentMonth = MONTHLY_STATS[MONTHLY_STATS.length - 1] ?? emptyMonth;
  const previousMonth = MONTHLY_STATS[MONTHLY_STATS.length - 2] ?? emptyMonth;
  const appointmentChange = previousMonth.appointments
    ? Math.round(
        ((currentMonth.appointments - previousMonth.appointments) /
          previousMonth.appointments) *
          100
      )
    : null;

  const usersByRole = USER_ROLES.map((role) => ({
    label: role.label,
    value: users.filter((user) => user.role === role.value).length,
    barClass: roleBarClasses[role.value],
  }));

  const recentActivity = [...activity]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <PageHeader
        eyebrow={t("Administration")}
        title={t("Admin Dashboard")}
        description={t("Monitor users, appointments, staff applications and patient feedback across the healthcare system.")}
        actions={
          <Link
            to="/admin/reports"
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50"
          >{t("📊 Open Reports")}</Link>
        }
      />

      {/* KPI CARDS (W70) */}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Total Users")}
          value={users.length}
          hint={t("{length} active accounts", { length: activeUsers.length })}
          icon="👥"
          tone="blue"
        />

        <StatCard
          label={t("Appointments ({month})", { month: currentMonth.month })}
          value={currentMonth.appointments}
          hint={
            appointmentChange === null
              ? t("No appointments in {month} to compare", { month: previousMonth.month })
              : t("{change}% vs. {month}", {
                  change: `${appointmentChange >= 0 ? "+" : ""}${appointmentChange}`,
                  month: previousMonth.month,
                })
          }
          icon="📅"
          tone="emerald"
        />

        <StatCard
          label={t("Pending Applications")}
          value={pendingApplications.length}
          hint={t("Awaiting administrator review")}
          icon="📝"
          tone="amber"
        />

        <StatCard
          label={t("Open Feedback")}
          value={openFeedback.length}
          hint={t("{count} complaints need attention", {
            count: openFeedback.filter((item) => item.type === "Complaint").length,
          })}
          icon="💬"
          tone="rose"
        />
      </section>

      {/* CHARTS (W71) */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <SectionCard
            title={t("Appointments per Month")}
            description={t("Booked appointments over the last six months")}
            action={<ViewAllLink to="/admin/reports">{t("Reports")}</ViewAllLink>}
          >
            <ColumnChart
              items={MONTHLY_STATS.map((month) => ({
                label: month.month,
                value: month.appointments,
              }))}
              height={220}
            />
          </SectionCard>
        </div>

        <div className="xl:col-span-2">
          <SectionCard
            title={t("Users by Role")}
            description={t("Registered accounts in the system")}
            action={<ViewAllLink to="/admin/users" />}
          >
            <BarList items={usersByRole} />
          </SectionCard>
        </div>
      </div>

      {/* TABLES */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title={t("Pending Applications")}
          description={t("Staff registrations awaiting review")}
          action={<ViewAllLink to="/admin/applications" />}
        >
          {pendingApplications.length === 0 ? (
            <EmptyState
              icon="✅"
              title={t("No pending applications")}
              message={t("All staff applications have been reviewed.")}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingApplications.slice(0, 4).map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      {application.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {getRoleLabel(application.role)} {t("· {department} · Submitted {submittedAt}", { department: t(application.department), submittedAt: localDate(application.submittedAt) })}</p>
                  </div>

                  <Badge variant={getStatusVariant(application.status)}>
                    {t(application.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t("Open Feedback")}
          description={t("Feedback and complaints that need a response")}
          action={<ViewAllLink to="/admin/feedback" />}
        >
          {openFeedback.length === 0 ? (
            <EmptyState
              icon="🎉"
              title={t("No open feedback")}
              message={t("Every feedback item has been handled.")}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {openFeedback.slice(0, 4).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      {item.subject}
                    </p>

                    <p className="text-xs text-slate-500">{t("{type} from {patient} · {submittedAt}", { type: t(item.type), patient: item.patient, submittedAt: localDate(item.submittedAt) })}</p>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(item.priority)}>
                      {t(item.priority)}
                    </Badge>

                    <Badge variant={getStatusVariant(item.status)}>
                      {t(item.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard
            title={t("Recent Activity")}
            description={t("Latest actions across the system")}
            action={<ViewAllLink to="/admin/activity" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4">{t("User")}</th>
                    <th className="pb-3 pr-4">{t("Action")}</th>
                    <th className="pb-3 pr-4">{t("Time")}</th>
                    <th className="pb-3">{t("Status")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentActivity.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-800">
                        {t(entry.user)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {translateActivity(entry.action)}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-500">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="py-3">
                        <Badge variant={getStatusVariant(entry.status)}>
                          {t(entry.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard title={t("Quick Actions")}>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">
                  {action.icon}
                </span>

                <span className="min-w-0">
                  <span className="block font-bold text-slate-800 group-hover:text-blue-700">
                    {t(action.title)}
                  </span>

                  <span className="block text-xs text-slate-500">
                    {action.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default AdminDashboard;
