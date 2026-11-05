import { useTranslation } from 'react-i18next';

import { useTheme } from '@app/ui';

import { setAppLanguage } from '../../lib/i18n.js';

export function useGuestLayout() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isArabic = i18n.language.startsWith('ar');
  return {
    brand: t('app.title'),
    theme,
    onThemeChange: setTheme,
    themeLabels: { light: t('shell.lightMode'), dark: t('shell.darkMode') },
    languageLabel: isArabic ? 'English' : 'العربية',
    onToggleLanguage: () => {
      void setAppLanguage(isArabic ? 'en' : 'ar');
    },
  };
}
