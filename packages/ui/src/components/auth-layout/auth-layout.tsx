import { LanguagesIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../button/index.js';
import { ThemeToggle, type ThemeToggleProps } from '../theme-toggle/index.js';

export interface AuthLayoutProps {
  children: ReactNode;
  brand: string;
  /** Logo shown in place of the initial tile (the app supplies it). */
  brandMark?: ReactNode;
  theme: ThemeToggleProps['theme'];
  onThemeChange: ThemeToggleProps['onThemeChange'];
  themeLabels: ThemeToggleProps['labels'];
  languageLabel: string;
  onToggleLanguage: () => void;
  /** Optional brand panel shown beside the form on large screens (the app supplies it). */
  aside?: ReactNode;
  /** Optional slip that peeks out from behind the top edge of the form panel (only with `aside`). */
  ticket?: ReactNode;
}

/** Sign in / sign up frame: brand on top, theme and language switches in the corner. */
export function AuthLayout({
  children,
  brand,
  brandMark,
  theme,
  onThemeChange,
  themeLabels,
  languageLabel,
  onToggleLanguage,
  aside,
  ticket,
}: AuthLayoutProps) {
  const brandRow = (
    <div className="mb-5 flex items-center gap-3">
      {brandMark ?? (
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground"
        >
          {brand.charAt(0)}
        </span>
      )}
      <h1 className="text-xl font-bold">{brand}</h1>
    </div>
  );
  if (aside) {
    return (
      <div className="relative isolate min-h-dvh overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden>
          {aside}
        </div>
        <header className="absolute inset-x-0 top-0 z-20 flex justify-end p-4">
          <div className="flex items-center gap-1 bg-background p-1 text-foreground">
            <Button type="button" variant="ghost" size="sm" onClick={onToggleLanguage}>
              <LanguagesIcon aria-hidden />
              {languageLabel}
            </Button>
            <ThemeToggle theme={theme} onThemeChange={onThemeChange} labels={themeLabels} />
          </div>
        </header>
        <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
          <div className="relative w-full max-w-md">
            {ticket ? <div className="relative mx-auto -mb-6 hidden w-[70%] [@media(min-height:840px)]:block">{ticket}</div> : null}
            <div className="relative bg-background p-6 text-foreground sm:p-8">
              {brandRow}
              {children}
            </div>
          </div>
        </main>
      </div>
    );
  }
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
          {brandMark ?? (
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground"
            >
              {brand.charAt(0)}
            </span>
          )}
          <h1 className="text-2xl font-bold">{brand}</h1>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
