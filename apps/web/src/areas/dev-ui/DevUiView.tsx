import { Label, Switch, ThemeToggle } from '@app/ui';

import { Showcase } from './Showcase.js';
import type { DevUiPageViewModel } from './use-dev-ui-page.js';

export function DevUiView({
  theme,
  onThemeChange,
  isArabic,
  onArabicChange,
  sideBySide,
  onSideBySideChange,
  copy,
  menu,
  confirm,
  locale,
  productForm,
  inputs,
}: DevUiPageViewModel) {
  const shared = { copy, menu, confirm, locale, productForm, inputs };
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <div className="me-auto">
            <h1 className="text-xl font-semibold">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="dev-ui-rtl" checked={isArabic} onCheckedChange={onArabicChange} />
            <Label htmlFor="dev-ui-rtl">{copy.toolbar.arabic}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="dev-ui-split" checked={sideBySide} onCheckedChange={onSideBySideChange} />
            <Label htmlFor="dev-ui-split">{copy.toolbar.sideBySide}</Label>
          </div>
          <ThemeToggle
            theme={theme}
            onThemeChange={onThemeChange}
            variant="outline"
            labels={{ light: copy.toolbar.toLight, dark: copy.toolbar.toDark }}
          />
        </div>
      </header>

      {sideBySide ? (
        <div className="grid lg:grid-cols-2">
          <div data-theme="cupcake" className="bg-background text-foreground">
            <Showcase {...shared} idPrefix="cupcake" themeName="cupcake" />
          </div>
          <div data-theme="forest" className="bg-background text-foreground">
            <Showcase {...shared} idPrefix="forest" themeName="forest" />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl">
          <Showcase {...shared} idPrefix="main" themeName={theme} />
        </div>
      )}
    </div>
  );
}
