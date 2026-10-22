import { t } from "../../i18n";
function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-400 sm:flex sm:items-center sm:justify-between sm:text-left">
      <p>
        © {new Date().getFullYear()} {t("Centralized Healthcare Management System")}</p>

      <p className="mt-1 sm:mt-0">{t("Demo build — sample data only")}</p>
    </footer>
  );
}

export default Footer;
