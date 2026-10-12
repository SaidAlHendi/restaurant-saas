import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** localStorage key for the chosen UI language (per device, like the theme). */
export const LANGUAGE_STORAGE_KEY = 'app.lang';

let listening = false;

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function readStoredLanguage(): Language | null {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function applyDocumentLocale(language: string): void {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
}

export async function initI18n(): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: readStoredLanguage() ?? 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  applyDocumentLocale(i18n.language);
  if (!listening) {
    i18n.on('languageChanged', applyDocumentLocale);
    listening = true;
  }
}

/** Switches the UI language and remembers it on this device. */
export async function setAppLanguage(language: Language): Promise<void> {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can be blocked (private mode); the language still applies for this visit.
  }
  await i18n.changeLanguage(language);
}

export { i18n };
