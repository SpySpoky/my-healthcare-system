import { LANGUAGES, getLanguage, setLanguage, t } from "../../i18n";

const TONES = {
  light: {
    group: "border-slate-200 bg-white shadow-sm",
    active: "bg-blue-600 text-white",
    idle: "text-slate-500 hover:bg-slate-100",
  },
  dark: {
    group: "border-white/25 bg-white/10 backdrop-blur-md",
    active: "bg-white text-indigo-700",
    idle: "text-white/80 hover:bg-white/15",
  },
};

// Switches the language (the page reloads in the new one).
function LanguageSwitcher({ tone = "light", className = "" }) {
  const styles = TONES[tone] || TONES.light;
  const current = getLanguage();

  return (
    <div
      role="group"
      aria-label={t("Language")}
      className={`inline-flex items-center gap-1 rounded-xl border p-1 ${styles.group} ${className}`}
    >
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          lang={language.code}
          title={language.label}
          aria-pressed={language.code === current}
          onClick={() => setLanguage(language.code)}
          className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition-colors ${
            language.code === current ? styles.active : styles.idle
          }`}
        >
          {language.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
