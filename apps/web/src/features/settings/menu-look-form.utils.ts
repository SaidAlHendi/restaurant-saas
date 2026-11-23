import { BRAND_COLOR_PATTERN, type MenuTheme, type MenuThemeLayout, type MenuThemePreset } from '@app/shared';

export const HERO_TEXT_MAX = 120;

/** Editable state of the Menu look screen; hero texts are plain strings so inputs stay controlled. */
export type MenuLookForm = {
  preset: MenuThemePreset;
  layout: MenuThemeLayout;
  heroEnabled: boolean;
  headlineEn: string;
  headlineAr: string;
  sublineEn: string;
  sublineAr: string;
  showSearch: boolean;
  showTicker: boolean;
  closingEn: string;
  closingAr: string;
  /** `#rrggbb`, or empty for the preset's own colours. */
  brandColor: string;
};

export function menuLookFormFromTheme(theme: MenuTheme): MenuLookForm {
  return {
    preset: theme.preset,
    layout: theme.layout,
    heroEnabled: theme.hero.enabled,
    headlineEn: theme.hero.headline.en ?? '',
    headlineAr: theme.hero.headline.ar ?? '',
    sublineEn: theme.hero.subline.en ?? '',
    sublineAr: theme.hero.subline.ar ?? '',
    showSearch: theme.showSearch,
    showTicker: theme.showTicker,
    closingEn: theme.closingLine.en ?? '',
    closingAr: theme.closingLine.ar ?? '',
    brandColor: theme.brandColor ?? '',
  };
}

function localized(en: string, ar: string): { en?: string; ar?: string } {
  const text: { en?: string; ar?: string } = {};
  if (en.trim() !== '') {
    text.en = en.trim();
  }
  if (ar.trim() !== '') {
    text.ar = ar.trim();
  }
  return text;
}

/** The theme to save: trimmed, with empty hero texts left out. */
export function menuThemeFromForm(form: MenuLookForm): MenuTheme {
  return {
    preset: form.preset,
    layout: form.layout,
    hero: {
      enabled: form.heroEnabled,
      headline: localized(form.headlineEn, form.headlineAr),
      subline: localized(form.sublineEn, form.sublineAr),
    },
    showSearch: form.showSearch,
    showTicker: form.showTicker,
    closingLine: localized(form.closingEn, form.closingAr),
    ...(BRAND_COLOR_PATTERN.test(form.brandColor) ? { brandColor: form.brandColor.toLowerCase() } : {}),
  };
}

export function isMenuLookDirty(form: MenuLookForm, saved: MenuTheme): boolean {
  const savedNormalized = menuThemeFromForm(menuLookFormFromTheme(saved));
  return JSON.stringify(menuThemeFromForm(form)) !== JSON.stringify(savedNormalized);
}

/** A hero with no headline in any language would render an empty banner. */
export function menuLookErrorKey(form: MenuLookForm): string | null {
  if (form.heroEnabled && form.headlineEn.trim() === '' && form.headlineAr.trim() === '') {
    return 'settings.menuLook.heroHeadlineRequired';
  }
  if (form.brandColor.trim() !== '' && !BRAND_COLOR_PATTERN.test(form.brandColor.trim())) {
    return 'settings.menuLook.brandColorInvalid';
  }
  return null;
}
