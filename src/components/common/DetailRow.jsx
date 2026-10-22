import { t } from "../../i18n";
// Label/value tile used inside detail modals. Render inside a <dl>.
function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {t(label)}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">{typeof value === "string" ? t(value) : value}</dd>
    </div>
  );
}

export default DetailRow;
