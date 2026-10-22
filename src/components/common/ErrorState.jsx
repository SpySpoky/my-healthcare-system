import { t } from "../../i18n";
function ErrorState({
  title = t("Something went wrong"),
  message = t("We couldn't load the requested information."),
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-12 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
        ⚠️
      </div>

      <h3 className="text-base font-bold text-red-800">
        {t(title)}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-red-700/80">
        {t(message)}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700"
        >{t("Try Again")}</button>
      )}
    </div>
  );
}

export default ErrorState;
