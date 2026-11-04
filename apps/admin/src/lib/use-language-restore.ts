'use client';

import { useEffect } from 'react';

import { applyDocumentLocale, i18n, readStoredLanguage } from './i18n';

/** After mount, switches to the saved language and keeps <html lang dir> in step with it. */
export function useLanguageRestore(): void {
  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored && stored !== i18n.language) void i18n.changeLanguage(stored);
    applyDocumentLocale(stored ?? i18n.language);
    const onChange = (language: string) => {
      applyDocumentLocale(language);
    };
    i18n.on('languageChanged', onChange);
    return () => {
      i18n.off('languageChanged', onChange);
    };
  }, []);
}
