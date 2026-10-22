import { t } from "../../i18n";
// Error or hint text shown under a form control.
function FieldMessage({ id, error, hint }) {
  if (error) {
    return (
      <p
        id={id}
        className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600"
      >
        <span aria-hidden="true">⚠</span>
        {error}
      </p>
    );
  }

  if (hint) {
    return (
      <p id={id} className="mt-1.5 text-xs text-slate-400">
        {t(hint)}
      </p>
    );
  }

  return null;
}

export default FieldMessage;
