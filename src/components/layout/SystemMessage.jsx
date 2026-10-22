import { Link } from "react-router-dom";

import { t } from "../../i18n";
const actionClasses = {
  primary:
    "rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5",
  secondary:
    "rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50",
};

// Full-page message used by the 404 and Access Denied pages.
// `actions`: [{ label, to } | { label, onClick }, ...]; the first is primary.
function SystemMessage({ code, icon, title, message, actions = [] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 text-center shadow-2xl shadow-indigo-950/30 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
          {icon}
        </div>

        {code && (
          <p className="mt-5 text-sm font-black tracking-[0.3em] text-indigo-500">
            {code}
          </p>
        )}

        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
          {t(title)}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">{t(message)}</p>

        <div className="mt-8 flex flex-col gap-3">
          {actions.map((action, index) => {
            const className =
              actionClasses[index === 0 ? "primary" : "secondary"];

            return action.to ? (
              <Link key={action.label} to={action.to} className={className}>
                {t(action.label)}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {t(action.label)}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default SystemMessage;
