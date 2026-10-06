import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@app/ui';

import { devUiCopy } from './dev-ui.copy.js';
import { useOrdersDemo } from './orders-demo.js';
import { useInputsDemo, useProductFormDemo } from './product-form-demo.js';

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

  const productForm = useProductFormDemo();
  const inputs = useInputsDemo();

  const isArabic = i18n.language === 'ar';
  const copy = isArabic ? devUiCopy.ar : devUiCopy.en;
  const locale = isArabic ? 'ar-SA' : 'en-SA';
  const orders = useOrdersDemo(copy, locale);

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
    copy,
    menu: {
      showArchived,
      onShowArchivedChange: setShowArchived,
      sortBy,
      onSortByChange: setSortBy,
    },
    confirm: { open: confirmOpen, onOpenChange: setConfirmOpen, isConfirming, onConfirm },
    productForm,
    inputs,
    locale,
    orders,
  };
}

export type DevUiPageViewModel = ReturnType<typeof useDevUiPage>;
export type DevUiMenuState = DevUiPageViewModel['menu'];
export type DevUiConfirmState = DevUiPageViewModel['confirm'];
