import { t } from "../../i18n";
// Numbered step section used by the booking and rescheduling forms.
function FormSection({ number, title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-sm font-black text-accent-700 ring-1 ring-accent-100">
          {number}
        </span>

        <div>
          <h2 className="text-lg font-black text-slate-900">{t(title)}</h2>

          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{t(description)}</p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

export default FormSection;
