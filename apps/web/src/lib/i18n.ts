import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

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
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
}

export { i18n };
