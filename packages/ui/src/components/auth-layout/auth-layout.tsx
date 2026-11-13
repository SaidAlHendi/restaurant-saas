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
}: AuthLayoutProps) {
  const controls = (
    <header className="flex items-center justify-end gap-2 p-4">
      <Button type="button" variant="ghost" size="sm" onClick={onToggleLanguage}>
        <LanguagesIcon aria-hidden />
        {languageLabel}
      </Button>
      <ThemeToggle theme={theme} onThemeChange={onThemeChange} labels={themeLabels} />
    </header>
  );
  const brandRow = (
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
  );
  if (aside) {
    return (
      <div className="grid min-h-dvh bg-foreground p-2 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden rounded-[10px] lg:block">{aside}</div>
        <div className="flex flex-col text-foreground">
          <div className="flex flex-1 flex-col rounded-[10px] bg-background text-foreground lg:ms-2">
            {controls}
            <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-6">
              <div className="lg:hidden">{brandRow}</div>
              <div className="w-full max-w-md">{children}</div>
            </main>
          </div>
        </div>
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
