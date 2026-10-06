import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

let listening = false;

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
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  applyDocumentLocale(i18n.language);
  if (!listening) {
    i18n.on('languageChanged', applyDocumentLocale);
    listening = true;
  }
}

export { i18n };
