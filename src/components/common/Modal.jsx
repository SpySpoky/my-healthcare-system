import { useId } from "react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

import { t } from "../../i18n";
function Modal({ title, children, isOpen, onClose }) {
  const titleId = useId();
  useEscapeKey(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}

        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-accent-50 to-accent2-50 px-6 py-5">
          <h3 id={titleId} className="text-xl font-bold text-slate-900">
            {t(title)}
          </h3>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none text-slate-400 transition-all duration-200 hover:bg-white hover:text-slate-700 hover:shadow-sm"
            onClick={onClose}
            aria-label={t("Close modal")}
          >
            ×
          </button>
        </div>

        {/* Content */}

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;