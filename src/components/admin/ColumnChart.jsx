import { t } from "../../i18n";
// Simple vertical bar chart for a short time series.
function ColumnChart({
  items,
  barClass = "from-blue-500 to-sky-400",
  height = 180,
  ariaLabel,
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div
      role="img"
      aria-label={
        ariaLabel ||
        items.map((item) => `${item.label}: ${item.value}`).join(", ")
      }
      className="flex items-end gap-3"
      style={{ height }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-xs font-bold text-slate-700">
            {item.value}
          </span>

          <div
            className={`w-full max-w-12 rounded-t-xl bg-gradient-to-t transition-all duration-300 group-hover:opacity-80 ${barClass}`}
            style={{ height: `${(item.value / max) * 100}%` }}
            title={`${item.label}: ${item.value}`}
          />

          <span className="text-xs font-semibold text-slate-400">
            {t(item.label)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default ColumnChart;
