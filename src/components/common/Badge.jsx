import { t } from "../../i18n";

function Badge({ children, variant = "default" }) {
  const variantStyles = {
    default:
      "bg-slate-100 text-slate-700 border border-slate-200",

    success:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",

    warning:
      "bg-amber-50 text-amber-700 border border-amber-200",

    danger:
      "bg-red-50 text-red-700 border border-red-200",

    secondary:
      "bg-slate-100 text-slate-600 border border-slate-200",

    primary:
      "bg-accent-50 text-accent-700 border border-accent-200",

    info:
      "bg-blue-50 text-blue-700 border border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold leading-5 shadow-sm ${
        variantStyles[variant] || variantStyles.default
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          variant === "success"
            ? "bg-emerald-500"
            : variant === "warning"
              ? "bg-amber-500"
              : variant === "danger"
                ? "bg-red-500"
                : variant === "primary"
                  ? "bg-accent-500"
                  : variant === "info"
                    ? "bg-blue-500"
                    : "bg-slate-400"
        }`}
      />

      {typeof children === "string" ? t(children) : children}
    </span>
  );
}

export default Badge;