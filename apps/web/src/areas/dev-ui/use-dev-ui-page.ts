import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@app/ui';

import { devUiCopy } from './dev-ui.copy.js';

/** Fake request time for the ConfirmDialog demo. */
const CONFIRM_DELAY_MS = 1200;

export function useDevUiPage() {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const [sideBySide, setSideBySide] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  const isArabic = i18n.language === 'ar';

  const onArabicChange = (checked: boolean) => {
    void i18n.changeLanguage(checked ? 'ar' : 'en');
  };

  const onConfirm = () => {
    setIsConfirming(true);
    confirmTimer.current = window.setTimeout(() => {
      setIsConfirming(false);
      setConfirmOpen(false);
    }, CONFIRM_DELAY_MS);
  };

  return {
    theme,
    onThemeChange: setTheme,
    isArabic,
    onArabicChange,
    sideBySide,
    onSideBySideChange: setSideBySide,
    copy: isArabic ? devUiCopy.ar : devUiCopy.en,
    menu: { showArchived, onShowArchivedChange: setShowArchived, sortBy, onSortByChange: setSortBy },
    confirm: { open: confirmOpen, onOpenChange: setConfirmOpen, isConfirming, onConfirm },
  };
}

export type DevUiPageViewModel = ReturnType<typeof useDevUiPage>;
export type DevUiMenuState = DevUiPageViewModel['menu'];
export type DevUiConfirmState = DevUiPageViewModel['confirm'];
