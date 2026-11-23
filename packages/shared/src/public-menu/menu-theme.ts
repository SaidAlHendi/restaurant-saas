import { z } from 'zod';

import { BRAND_COLOR_PATTERN, resolveBrandColor, type ResolvedBrandColor } from './brand-color.js';

/** Curated looks for the public QR menu. Every preset is tested for contrast; owners pick one. */
export const menuThemePresetSchema = z.enum(['classic', 'forest', 'espresso', 'midnight']);

/** How dishes are laid out: photo grid, list with a photo beside each dish, or text only. */
export const menuThemeLayoutSchema = z.enum(['grid', 'list', 'compact']);

const heroTextSchema = z.object({
  ar: z.string().trim().max(120).optional(),
  en: z.string().trim().max(120).optional(),
});

export const menuThemeSchema = z.object({
  preset: menuThemePresetSchema.default('classic'),
  layout: menuThemeLayoutSchema.default('list'),
  hero: z
    .object({
      enabled: z.boolean().default(false),
      headline: heroTextSchema.default({}),
      subline: heroTextSchema.default({}),
    })
    .default({ enabled: false, headline: {}, subline: {} }),
  showSearch: z.boolean().default(false),
  /** The owner's brand colour (#rrggbb). Primary colours are derived from it; see `resolveBrandColor`. */
  brandColor: z.string().regex(BRAND_COLOR_PATTERN).optional(),
  /** A slowly scrolling band of category names under the hero. */
  showTicker: z.boolean().default(false),
  /** Large closing line in the footer; empty in both languages = no closing line. */
  closingLine: heroTextSchema.default({}),
});

/** Public URLs of the hero cover photo (portrait 4:5, WebP). */
export const menuCoverUrlsSchema = z.object({ url480: z.url(), url960: z.url() });
export type MenuCoverUrls = z.infer<typeof menuCoverUrlsSchema>;

export type MenuTheme = z.infer<typeof menuThemeSchema>;
export type MenuThemeLayout = z.infer<typeof menuThemeLayoutSchema>;
export type MenuThemePreset = z.infer<typeof menuThemePresetSchema>;

/** The look every restaurant has until its owner changes it. */
export const DEFAULT_MENU_THEME: MenuTheme = menuThemeSchema.parse({});

/**
 * Colour tokens per preset, as CSS variables. `classic` overrides nothing: it keeps the app theme.
 * Used by the public menu and by the dashboard preview, so both always match.
 * Every token a component can read, so no preset falls back to the app theme's colours
 * (a light border or popover on `midnight` would flash white).
 */
function presetVars(c: {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
}): Record<`--${string}`, string> {
  return {
    '--background': c.background,
    '--foreground': c.foreground,
    '--card': c.background,
    '--card-foreground': c.foreground,
    '--popover': c.background,
    '--popover-foreground': c.foreground,
    '--muted': c.muted,
    '--muted-foreground': c.mutedForeground,
    '--secondary': c.muted,
    '--secondary-foreground': c.foreground,
    '--accent': c.muted,
    '--accent-foreground': c.foreground,
    '--primary': c.primary,
    '--primary-foreground': c.primaryForeground,
    '--border': `color-mix(in oklch, ${c.foreground} 14%, ${c.background})`,
    '--input': `color-mix(in oklch, ${c.foreground} 24%, ${c.background})`,
    '--ring': c.primary,
  };
}

export const MENU_PRESET_VARS: Record<MenuThemePreset, Record<`--${string}`, string>> = {
  classic: {},
  forest: presetVars({
    background: '#f3eee2',
    foreground: '#16241c',
    muted: '#e6dfcd',
    mutedForeground: '#566158',
    primary: '#1f4a37',
    primaryForeground: '#e3f4b0',
  }),
  espresso: presetVars({
    background: '#fbf7f2',
    foreground: '#2a1b14',
    muted: '#efe5da',
    mutedForeground: '#76624f',
    primary: '#4a2c1d',
    primaryForeground: '#fff1e0',
  }),
  midnight: presetVars({
    background: '#101418',
    foreground: '#f2f4f7',
    muted: '#1c232b',
    mutedForeground: '#a2adb9',
    primary: '#e8c46a',
    primaryForeground: '#1a1405',
  }),
};

/** Hero text in the guest's language, falling back to the other language, then to `fallback`. */
export function heroText(
  text: { ar?: string | undefined; en?: string | undefined },
  locale: 'ar' | 'en',
  fallback: string,
): string {
  const other = locale === 'ar' ? 'en' : 'ar';
  return text[locale]?.trim() || text[other]?.trim() || fallback;
}

/** Background colour of each preset, used to check the brand colour's contrast. `classic` is the app theme's `--canvas`. */
export const MENU_PRESET_BACKGROUND: Record<MenuThemePreset, string> = {
  classic: '#f3ecdf',
  forest: '#f3eee2',
  espresso: '#fbf7f2',
  midnight: '#101418',
};

/** The brand colour as the menu will use it (adjusted if needed), or null when none is set. */
export function resolveThemeBrand(theme: Pick<MenuTheme, 'preset' | 'brandColor'>): ResolvedBrandColor | null {
  return theme.brandColor ? resolveBrandColor(theme.brandColor, MENU_PRESET_BACKGROUND[theme.preset]) : null;
}

/** CSS variables for a theme: the preset's tokens, with primary colours derived from the brand colour. */
export function menuThemeVars(theme: MenuTheme): Record<`--${string}`, string> {
  const brand = resolveThemeBrand(theme);
  const vars = { ...MENU_PRESET_VARS[theme.preset] };
  if (brand) {
    vars['--primary'] = brand.color;
    vars['--primary-foreground'] = brand.foreground;
    vars['--ring'] = brand.color;
  }
  return vars;
}

/** True when the theme is the default look, i.e. what a Free plan may use. */
export function isDefaultMenuTheme(theme: MenuTheme): boolean {
  return JSON.stringify(menuThemeSchema.parse(theme)) === JSON.stringify(DEFAULT_MENU_THEME);
}

/** The look guests get: the saved theme on plans with `menu.branding`, the default look otherwise. */
export function effectiveMenuTheme(theme: MenuTheme, allowed: boolean): MenuTheme {
  return allowed ? theme : DEFAULT_MENU_THEME;
}
