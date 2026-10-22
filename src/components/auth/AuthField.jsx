import { useState } from "react";
import { t } from "../../i18n";
import { EyeIcon, EyeOffIcon } from "./AuthIcons";
// Labelled input (or select) for the authentication pages,
// with an optional leading icon, hint and inline error.
// Password fields get a button that shows or hides the password.

const fieldClass = (hasError, hasIcon, hasToggle) =>
  `w-full rounded-2xl border bg-slate-50 py-3.5 ${
    hasIcon ? "pl-12" : "pl-4"
  } ${hasToggle ? "pr-12" : "pr-4"} text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  }`;

export function AuthFieldError({ id, message }) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600"
    >
      <span aria-hidden="true">⚠</span>
      {t(message)}
    </p>
  );
}

function AuthField({
  id,
  label,
  icon,
  error,
  hint,
  as = "input",
  type,
  children,
  ...inputProps
}) {
  const [showPassword, setShowPassword] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Control = as;
  const isPassword = type === "password";

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {t(label)}
      </label>

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            {icon}
          </div>
        )}

        <Control
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={fieldClass(Boolean(error), Boolean(icon), isPassword)}
          type={isPassword && showPassword ? "text" : type}
          {...inputProps}
        >
          {children}
        </Control>

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            disabled={inputProps.disabled}
            aria-label={showPassword ? t("Hide password") : t("Show password")}
            aria-pressed={showPassword}
            aria-controls={id}
            title={showPassword ? t("Hide password") : t("Show password")}
            className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl px-4 text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-blue-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {error ? (
        <AuthFieldError id={`${id}-error`} message={error} />
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-2 text-xs text-slate-400">
            {t(hint)}
          </p>
        )
      )}
    </div>
  );
}

export default AuthField;
