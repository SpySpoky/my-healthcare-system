import { t } from "../../i18n";
const variantStyles = {
  info: "border-accent-200 bg-accent-50 text-accent-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

function Alert({
  children,
  variant = "info",
  title,
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        variantStyles[variant] || variantStyles.info
      }`}
    >
      {title && (
        <strong className="mb-0.5 block font-bold">
          {t(title)}
        </strong>
      )}

      <span>{children}</span>
    </div>
  );
}

export default Alert;
