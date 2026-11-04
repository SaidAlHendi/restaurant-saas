import { LanguagesIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../button/index.js';
import { ThemeToggle, type ThemeToggleProps } from '../theme-toggle/index.js';

export interface AuthLayoutProps {
  children: ReactNode;
  brand: string;
  theme: ThemeToggleProps['theme'];
  onThemeChange: ThemeToggleProps['onThemeChange'];
  themeLabels: ThemeToggleProps['labels'];
  languageLabel: string;
  onToggleLanguage: () => void;
}

/** Sign in / sign up frame: brand on top, theme and language switches in the corner. */
export function AuthLayout({
  children,
  brand,
  theme,
  onThemeChange,
  themeLabels,
  languageLabel,
  onToggleLanguage,
}: AuthLayoutProps) {
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
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
