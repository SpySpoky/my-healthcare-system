import FieldMessage from "./FieldMessage";
import {
  controlBaseClass,
  controlStateClass,
  describedBy,
} from "./formStyles";

import { t } from "../../i18n";
function Input({
  label,
  type = "text",
  name,
  id = name,
  placeholder = "",
  value,
  onChange,
  required = false,
  disabled = false,
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

      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlBaseClass} ${controlStateClass(Boolean(error))}`}
        {...rest}
      />

      <FieldMessage id={`${id}-message`} error={error} hint={hint} />
    </div>
  );
}

export default Input;
