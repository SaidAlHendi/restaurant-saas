'use client';

import { useTranslation } from 'react-i18next';

import { useTheme } from '@app/ui';

import { setAppLanguage } from '@/lib/i18n';

/** Props for the shared AuthLayout: brand, theme switch and language switch. */
export function useGuestFrame() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isArabic = i18n.language.startsWith('ar');
  return {
    brand: t('app.title'),
    theme,
    onThemeChange: setTheme,
    themeLabels: { light: t('shell.lightMode'), dark: t('shell.darkMode') },
    // Always shown in the language it switches to, so it can be found in either language.
    languageLabel: isArabic ? 'English' : 'العربية',
    onToggleLanguage: () => {
      void setAppLanguage(isArabic ? 'en' : 'ar');
    },
  };
}
