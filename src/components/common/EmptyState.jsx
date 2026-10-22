import { t } from "../../i18n";
function EmptyState({
  title = t("No data available"),
  message = t("There is nothing to display here."),
  icon = "📭",
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
        {icon}
      </div>

      <h3 className="text-base font-bold text-slate-800">
        {t(title)}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        {t(message)}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
