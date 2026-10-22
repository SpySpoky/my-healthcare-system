import FieldMessage from "./FieldMessage";
import {
  controlBaseClass,
  controlStateClass,
  describedBy,
} from "./formStyles";

import { t } from "../../i18n";
function Select({
  label,
  name,
  id = name,
  options = [],
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = t("Select an option"),
  error,
  hint,
  ...rest
}) {
  return (
    <div className="mb-5 w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {t(label)}

        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={`${controlBaseClass} appearance-none pr-11 ${controlStateClass(
            Boolean(error)
          )}`}
          {...rest}
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      <FieldMessage id={`${id}-message`} error={error} hint={hint} />
    </div>
  );
}

export default Select;
