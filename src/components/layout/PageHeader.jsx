import { t } from "../../i18n";
// Gradient page header used at the top of portal pages.
// Colours follow the current portal's accent (see index.css).
function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent-700 via-accent-600 to-accent2-600 p-6 text-white shadow-2xl shadow-accent-500/20 sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

      <div className="pointer-events-none absolute -bottom-32 right-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && (
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/75">
              {t(eyebrow)}
            </div>
          )}

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {t(title)}
          </h1>

          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              {t(description)}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

export default PageHeader;
