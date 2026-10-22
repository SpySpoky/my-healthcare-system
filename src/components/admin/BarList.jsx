import { getLocale, t } from "../../i18n";
// Horizontal bar breakdown: one labelled bar per item,
// scaled against the largest value.
function BarList({ items, barClass = "bg-blue-500", valueSuffix = "" }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const percent = total
          ? Math.round((item.value / total) * 100)
          : 0;

        return (
          <li key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-700">
                {t(item.label)}
              </span>

              <span className="shrink-0 font-bold text-slate-900">
                {item.value.toLocaleString(getLocale())}
                {valueSuffix}
                <span className="ml-1.5 text-xs font-semibold text-slate-400">
                  {percent}%
                </span>
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.barClass || barClass}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default BarList;
