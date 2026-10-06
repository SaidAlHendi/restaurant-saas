import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@app/ui';

import { devUiCopy } from './dev-ui.copy.js';

export function useDevUiPage() {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const [sideBySide, setSideBySide] = useState(false);

  const isArabic = i18n.language === 'ar';

  const onArabicChange = (checked: boolean) => {
    void i18n.changeLanguage(checked ? 'ar' : 'en');
  };

  return {
    theme,
    onThemeChange: setTheme,
    isArabic,
    onArabicChange,
    sideBySide,
    onSideBySideChange: setSideBySide,
    copy: isArabic ? devUiCopy.ar : devUiCopy.en,
  };
}

export type DevUiPageViewModel = ReturnType<typeof useDevUiPage>;
