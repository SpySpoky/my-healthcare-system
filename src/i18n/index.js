// Translations. The English text itself is the key: t("Sign In") returns
// the Turkish text when the language is Turkish and the English text
// otherwise (so a missing translation is never blank).
//
// The language is fixed for the lifetime of a page: changing it saves the
// choice and reloads, so text that is translated while a module loads
// (menus, constant lists) is correct too.

import tr from "./tr.js";

const STORAGE_KEY = "healthcare_language";

export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-GB" },
  { code: "tr", label: "Türkçe", locale: "tr-TR" },
];

const dictionaries = { tr };

const isSupported = (code) => LANGUAGES.some((language) => language.code === code);

const detectLanguage = () => {
  // Used by the Turkish test run (npm run test:tr).
  const forced = import.meta.env?.VITE_FORCE_LANGUAGE;

  if (isSupported(forced)) return forced;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (isSupported(saved)) return saved;
  } catch {
    // Storage is unavailable: use the default.
  }

  return "en";
};

let current = detectLanguage();

export const getLanguage = () => current;

// Browser locale for dates and numbers ("en-GB" / "tr-TR").
export const getLocale = () => LANGUAGES.find((language) => language.code === current).locale;

// Lowercase in the current language (Turkish has dotted and dotless i).
export const lower = (text) => String(text).toLocaleLowerCase(getLocale());

// Saves the choice and reloads the page so everything renders in it.
export const setLanguage = (code) => {
  if (!isSupported(code) || code === current) return;

  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // The page still reloads; the choice just will not be remembered.
  }

  window.location.reload();
};

// Switches the language without reloading (for tests).
export const setLanguageForTests = (code) => {
  current = isSupported(code) ? code : "en";
  document.documentElement.lang = current;
};

// Translates `text`. {name} placeholders are filled from `params`.
export const t = (text, params) => {
  if (typeof text !== "string") return text;

  const translated = dictionaries[current]?.[text] ?? text;

  return params
    ? translated.replace(/\{(\w+)\}/g, (match, key) => (key in params ? params[key] : match))
    : translated;
};

if (typeof document !== "undefined") {
  document.documentElement.lang = current;
}
