import { Link } from "react-router-dom";

import { t } from "../../i18n";
const roleStyles = {
  patient: {
    icon: "bg-cyan-50 ring-cyan-100",
    hover: "hover:border-cyan-300 hover:bg-cyan-50/60",
  },
  doctor: {
    icon: "bg-indigo-50 ring-indigo-100",
    hover: "hover:border-indigo-300 hover:bg-indigo-50/60",
  },
  medical_staff: {
    icon: "bg-violet-50 ring-violet-100",
    hover: "hover:border-violet-300 hover:bg-violet-50/60",
  },
  admin: {
    icon: "bg-blue-50 ring-blue-100",
    hover: "hover:border-blue-300 hover:bg-blue-50/60",
  },
};

// First login step: one card per account type, each linking to
// that role's sign-in page (/login/<slug>).
function RoleSelector({ roles }) {
  return (
    <nav aria-label={t("Choose account type")}>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {roles.map((role) => {
          const styles = roleStyles[role.value];

          return (
            <li key={role.value}>
              <Link
                to={`/login/${role.slug}`}
                className={`group flex h-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-1 py-3 text-center shadow-sm sm:px-2 sm:py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 ${styles.hover}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ring-1 sm:h-12 sm:w-12 sm:text-2xl ${styles.icon}`}
                >
                  {role.icon}
                </span>

                <span className="min-w-0">
                  <span className="block text-[11px] font-bold leading-tight tracking-tight text-slate-900 sm:text-sm sm:tracking-normal">
                    {t(role.label)}
                  </span>
                  <span className="mt-0.5 hidden text-[11px] leading-tight text-slate-500 sm:block">
                    {role.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default RoleSelector;
