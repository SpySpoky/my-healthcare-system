import { t } from "../../i18n";
// Grid of selectable appointment times.
function TimeSlotPicker({ slots, value, onChange, label = t("Available times") }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-slate-700">
        {t(label)}
      </legend>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((time) => {
          const isSelected = value === time;

          return (
            <button
              key={time}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(time)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                isSelected
                  ? "border-accent-500 bg-accent-600 text-white shadow-md shadow-accent-500/25"
                  : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50"
              }`}
            >
              {isSelected && <span aria-hidden="true">✓</span>}
              {t(time)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default TimeSlotPicker;
