import { LanguagesIcon } from 'lucide-react';
import { Outlet } from 'react-router-dom';

import { Button, ThemeToggle } from '@app/ui';

import { useGuestLayout } from './use-guest-layout.js';

/** Sign in / sign up frame: brand on top, theme and language switches in the corner. */
export function GuestLayout() {
  const { brand, theme, onThemeChange, themeLabels, languageLabel, onToggleLanguage } =
    useGuestLayout();
  return (
    <div className="flex min-h-dvh flex-col bg-muted">
      <header className="flex items-center justify-end gap-2 p-4">
        <Button type="button" variant="ghost" size="sm" onClick={onToggleLanguage}>
          <LanguagesIcon aria-hidden />
          {languageLabel}
        </Button>
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} labels={themeLabels} />
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="mb-8 flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground"
          >
            {brand.charAt(0)}
          </span>
          <h1 className="text-2xl font-bold">{brand}</h1>
        </div>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
