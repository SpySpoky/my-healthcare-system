import { t } from "../../i18n";
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  const baseButton =
    "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label={t("Pagination")}
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        type="button"
        className={`${baseButton} text-slate-600 hover:bg-slate-100`}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >{t("‹ Prev")}</button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          aria-current={page === currentPage ? "page" : undefined}
          className={`${baseButton} ${
            page === currentPage
              ? "bg-accent-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => onPageChange(page)}
        >
          {t(page)}
        </button>
      ))}

      <button
        type="button"
        className={`${baseButton} text-slate-600 hover:bg-slate-100`}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >{t("Next ›")}</button>
    </nav>
  );
}

export default Pagination;
