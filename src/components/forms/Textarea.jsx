import FieldMessage from "./FieldMessage";
import {
  controlBaseClass,
  controlStateClass,
  describedBy,
} from "./formStyles";

import { t } from "../../i18n";
function Textarea({
  label,
  name,
  id = name,
  placeholder = "",
  value,
  onChange,
  required = false,
  disabled = false,
  rows = 5,
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

      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlBaseClass} resize-y leading-6 ${controlStateClass(
          Boolean(error)
        )}`}
        {...rest}
      />

      <FieldMessage id={`${id}-message`} error={error} hint={hint} />
    </div>
  );
}

export default Textarea;
