import { t } from "../../i18n";
const variantStyles = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "bg-emerald-100",
    text: "text-emerald-700",
    path: "m5 12 4 4L19 6",
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800",
    icon: "bg-red-100",
    text: "text-red-700",
    path: "M12 8v4M12 16h.01",
  },
};

// Success / error banner shown above authentication forms.
function AuthStatusMessage({ variant = "success", title, children }) {
  const styles = variantStyles[variant] || variantStyles.success;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${styles.container}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          {variant === "error" && <circle cx="12" cy="12" r="9" />}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={styles.path}
          />
        </svg>
      </div>

      <div>
        <strong className="block text-sm font-bold">{t(title)}</strong>

        {children && (
          <div className={`mt-1 text-xs leading-5 ${styles.text}`}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthStatusMessage;
