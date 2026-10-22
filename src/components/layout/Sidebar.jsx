import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useUnreadMessages } from "../../hooks/useUnreadMessages";

import { t } from "../../i18n";
const navigation = {
  patient: [
    { label: t("Dashboard"), path: "/patient/dashboard" },
    { label: t("Appointments"), path: "/patient/appointments" },
    { label: t("Medical Records"), path: "/patient/medical-records" },
    { label: t("Messages"), path: "/patient/messages" },
    { label: t("Feedback"), path: "/patient/feedback" },
    { label: t("Profile"), path: "/patient/profile" },
  ],

  doctor: [
    {
      label: t("Dashboard"),
      path: "/doctor/dashboard",
    },
    {
      label: t("Appointments"),
      path: "/doctor/appointments",
    },
    {
      label: t("Availability"),
      path: "/doctor/availability",
    },
    {
      label: t("Patients"),
      path: "/doctor/patients",
    },
    {
      label: t("Messages"),
      path: "/doctor/messages",
    },
  ],

  admin: [
    {
      label: t("Dashboard"),
      path: "/admin/dashboard",
    },
    {
      label: t("Users"),
      path: "/admin/users",
    },
    {
      label: t("Applications"),
      path: "/admin/applications",
    },
    {
      label: t("Feedback"),
      path: "/admin/feedback",
    },
    {
      label: t("Reports"),
      path: "/admin/reports",
    },
    {
      label: t("Activity"),
      path: "/admin/activity",
    },
  ],
};

const roleStyles = {
  patient: {
    gradient: "from-cyan-600 to-emerald-600",
    active:
      "bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-100",
    icon: "bg-cyan-100 text-cyan-700",
    hover: "hover:bg-cyan-50 hover:text-cyan-700",
    dot: "bg-emerald-400",
  },

  doctor: {
    gradient: "from-indigo-600 to-violet-600",
    active:
      "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100",
    icon: "bg-indigo-100 text-indigo-700",
    hover: "hover:bg-indigo-50 hover:text-indigo-700",
    dot: "bg-violet-400",
  },

  admin: {
    gradient: "from-blue-600 to-blue-500",
    active:
      "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100",
    icon: "bg-blue-100 text-blue-700",
    hover: "hover:bg-blue-50 hover:text-blue-700",
    dot: "bg-blue-300",
  },
};

// Keyed by the last part of the route (not the label, which is translated).
const navigationIcons = {
  dashboard: "⌂",
  appointments: "▣",
  "medical-records": "▤",
  feedback: "✦",
  messages: "✉",
  profile: "●",
  availability: "◷",
  patients: "♙",
  users: "♙",
  applications: "▢",
  reports: "▥",
  activity: "◉",
};

const routeKey = (path) => path.split("/").pop();

function Sidebar({ role, isOpen, onClose }) {
  const { user } = useAuth();
  const unreadMessages = useUnreadMessages(user);
  const links = navigation[role] || [];
  const styles = roleStyles[role] || roleStyles.patient;

  const roleName =
    role === "patient"
      ? t("Patient Portal")
      : role === "doctor"
        ? t("Doctor Portal")
        : role === "admin"
          ? t("Administration")
          : t("Healthcare Portal");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="
            fixed inset-0 z-40
            bg-slate-950/45
            backdrop-blur-sm
            lg:hidden
          "
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-[72px] z-50
          flex h-[calc(100vh-72px)] w-[270px]
          flex-col
          border-r border-slate-200
          bg-white
          shadow-xl shadow-slate-900/5

          transition-transform duration-300 ease-out

          lg:sticky
          lg:top-[72px]
          lg:z-30
          lg:h-[calc(100vh-72px)]
          lg:translate-x-0
          lg:shadow-none

          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Brand / portal header */}
        <div className="border-b border-slate-100 p-4">
          <div
            className={`
              relative overflow-hidden
              rounded-2xl
              bg-gradient-to-br ${styles.gradient}
              p-4
              text-white
              shadow-lg shadow-slate-900/10
            `}
          >
            {/* Decorative circle */}
            <div
              className="
                absolute -right-8 -top-8
                h-24 w-24
                rounded-full
                bg-white/10
              "
            />

            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-xl
                    bg-white/15
                    text-lg
                    shadow-inner
                  "
                >
                  ♥
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/70">{t("Healthcare")}</p>

                  <h2 className="text-sm font-extrabold tracking-tight">{t("Healthcare System")}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`
                    h-2 w-2 rounded-full
                    ${styles.dot}
                    shadow-[0_0_0_4px_rgba(255,255,255,0.10)]
                  `}
                />

                <span className="text-[10px] font-semibold text-white/80">
                  {roleName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-3 px-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[1.5px] text-slate-400">{t("Main Menu")}</p>
          </div>

          <nav aria-label={t("Main menu")} className="space-y-1">
            {links.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `
                  group
                  flex items-center gap-3
                  rounded-xl
                  px-3 py-2
                  text-sm font-semibold
                  transition-all duration-200

                  ${
                    isActive
                      ? styles.active
                      : `text-slate-500 ${styles.hover}`
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {/* Icon */}
                    <span
                      className={`
                        flex h-8 w-8 shrink-0
                        items-center justify-center
                        rounded-lg
                        text-sm
                        transition-all duration-200

                        ${
                          isActive
                            ? styles.icon
                            : "bg-slate-100 text-slate-400 group-hover:bg-white"
                        }
                      `}
                    >
                      {navigationIcons[routeKey(item.path)] || "•"}
                    </span>

                    {/* Label */}
                    <span className="flex-1 truncate">
                      {t(item.label)}
                    </span>

                    {routeKey(item.path) === "messages" && unreadMessages > 0 && (
                      <span
                        className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white"
                        aria-label={t("{unreadMessages} unread", { unreadMessages })}
                      >
                        {unreadMessages}
                      </span>
                    )}

                    {/* Active indicator */}
                    {isActive && (
                      <span
                        className={`
                          h-1.5 w-1.5
                          rounded-full
                          ${styles.dot}
                        `}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom status */}
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`
                    absolute inline-flex
                    h-full w-full
                    animate-ping
                    rounded-full
                    opacity-60
                    ${styles.dot}
                  `}
                />

                <span
                  className={`
                    relative inline-flex
                    h-2.5 w-2.5
                    rounded-full
                    ${styles.dot}
                  `}
                />
              </span>

              <span className="text-[10px] font-bold text-slate-500">{t("System Online")}</span>
            </div>

            <p className="mt-1 pl-4 text-[9px] text-slate-400">{t("Healthcare Management System")}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;