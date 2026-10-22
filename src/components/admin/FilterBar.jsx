import { t } from "../../i18n";
// Search box plus compact filter selects used on admin list pages.

export function SearchInput({ value, onChange, placeholder = t("Search...") }) {
  return (
    <div className="relative w-full min-w-0 lg:min-w-[260px] lg:flex-1">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
        🔍
      </span>

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-bold text-slate-500 sm:flex-none">
      {t(label)}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => {
          const optionValue =
            typeof option === "string" ? option : option.value;
          const optionLabel =
            typeof option === "string" ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {t(optionLabel)}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function FilterBar({ children, onClear, canClear }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >{t("Clear filters")}</button>
      )}
    </div>
  );
}

export default FilterBar;
