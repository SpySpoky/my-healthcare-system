const variantStyles = {
  danger: {
    header: "from-red-50 to-orange-50",
    icon: "bg-red-100 text-red-600",
    symbol: "!",
    button:
      "from-red-500 to-rose-500 shadow-red-500/20 hover:from-red-600 hover:to-rose-600 focus:ring-red-500/20",
  },
  success: {
    header: "from-emerald-50 to-teal-50",
    icon: "bg-emerald-100 text-emerald-600",
    symbol: "✓",
    button:
      "from-emerald-500 to-green-500 shadow-emerald-500/20 hover:from-emerald-600 hover:to-green-600 focus:ring-emerald-500/20",
  },
  primary: {
    header: "from-blue-50 to-sky-50",
    icon: "bg-blue-100 text-blue-600",
    symbol: "?",
    button:
      "from-blue-600 to-sky-500 shadow-blue-500/20 hover:from-blue-700 hover:to-sky-600 focus:ring-blue-500/20",
  },
};

import { useId } from "react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

import { t } from "../../i18n";
function ConfirmDialog({
  title = t("Are you sure?"),
  message = t("This action cannot be undone."),
  isOpen,
  onConfirm,
  onCancel,
  confirmText = t("Confirm"),
  cancelText = t("Cancel"),
  variant = "danger",
}) {
  const titleId = useId();
  useEscapeKey(isOpen, onCancel);

  if (!isOpen) {
    return null;
  }

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}

        <div
          className={`border-b border-slate-100 bg-gradient-to-r px-6 py-5 ${styles.header}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${styles.icon}`}
            >
              {styles.symbol}
            </div>

            <h3 id={titleId} className="text-xl font-bold text-slate-900">
              {t(title)}
            </h3>
          </div>
        </div>

        {/* Content */}

        <div className="px-6 py-6">
          <p className="text-sm leading-7 text-slate-600">
            {t(message)}
          </p>
        </div>

        {/* Actions */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="
              inline-flex
              min-h-10
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              px-5
              py-2.5
              text-sm
              font-bold
              text-slate-700
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:border-accent-200
              hover:bg-accent-50
              hover:text-accent-700
              hover:shadow-md
              focus:outline-none
              focus:ring-4
              focus:ring-accent-500/20
            "
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 ${styles.button}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;