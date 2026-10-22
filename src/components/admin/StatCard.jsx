import { t } from "../../i18n";
const toneStyles = {
  blue: {
    background: "from-blue-50 via-white to-sky-50",
    icon: "bg-blue-100 text-blue-600",
  },
  emerald: {
    background: "from-emerald-50 via-white to-teal-50",
    icon: "bg-emerald-100 text-emerald-600",
  },
  amber: {
    background: "from-amber-50 via-white to-orange-50",
    icon: "bg-amber-100 text-amber-600",
  },
  rose: {
    background: "from-rose-50 via-white to-pink-50",
    icon: "bg-rose-100 text-rose-600",
  },
  violet: {
    background: "from-violet-50 via-white to-purple-50",
    icon: "bg-violet-100 text-violet-600",
  },
};

function StatCard({ label, value, hint, icon, tone = "blue" }) {
  const styles = toneStyles[tone] || toneStyles.blue;

  return (
    <article
      className={`rounded-3xl border border-slate-200 bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${styles.background}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {t(label)}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${styles.icon}`}
        >
          {icon}
        </div>
      </div>

      {hint && (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {t(hint)}
        </p>
      )}
    </article>
  );
}

export default StatCard;
