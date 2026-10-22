import { t } from "../../i18n";
function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">{t(title)}</h2>

            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{t(description)}</p>
            )}
          </div>

          {action}
        </div>
      )}

      <div className="p-6">{children}</div>
    </section>
  );
}

export default SectionCard;
