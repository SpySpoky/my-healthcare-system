import { t } from "../../i18n";
function Loading({ text = t("Loading...") }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-accent-500" />

      <p className="text-sm font-semibold text-slate-500">
        {t(text)}
      </p>
    </div>
  );
}

export default Loading;
