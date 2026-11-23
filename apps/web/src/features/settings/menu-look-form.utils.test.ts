import { DEFAULT_MENU_THEME, menuThemeSchema } from '@app/shared';
import { describe, expect, it } from 'vitest';

import {
  isMenuLookDirty,
  menuLookErrorKey,
  menuLookFormFromTheme,
  menuThemeFromForm,
} from './menu-look-form.utils.js';

describe('menu look form', () => {
  it('round-trips the default theme without changes', () => {
    const form = menuLookFormFromTheme(DEFAULT_MENU_THEME);
    expect(menuThemeFromForm(form)).toEqual(DEFAULT_MENU_THEME);
    expect(isMenuLookDirty(form, DEFAULT_MENU_THEME)).toBe(false);
  });

  it('trims hero text and leaves empty languages out, producing a valid theme', () => {
    const form = {
      ...menuLookFormFromTheme(DEFAULT_MENU_THEME),
      heroEnabled: true,
      headlineEn: '  Welcome  ',
      headlineAr: '   ',
      sublineAr: 'أهلاً',
    };
    const theme = menuThemeFromForm(form);
    expect(theme.hero.headline).toEqual({ en: 'Welcome' });
    expect(theme.hero.subline).toEqual({ ar: 'أهلاً' });
    expect(menuThemeSchema.safeParse(theme).success).toBe(true);
  });

  it('is dirty after changing a field, and clean again when changed back', () => {
    const form = menuLookFormFromTheme(DEFAULT_MENU_THEME);
    expect(isMenuLookDirty({ ...form, showSearch: true }, DEFAULT_MENU_THEME)).toBe(true);
    expect(isMenuLookDirty({ ...form, headlineEn: '   ' }, DEFAULT_MENU_THEME)).toBe(false);
  });

  it('asks for a headline when the hero is on', () => {
    const form = { ...menuLookFormFromTheme(DEFAULT_MENU_THEME), heroEnabled: true };
    expect(menuLookErrorKey(form)).toBe('settings.menuLook.heroHeadlineRequired');
    expect(menuLookErrorKey({ ...form, headlineAr: 'أهلاً' })).toBeNull();
    expect(menuLookErrorKey({ ...form, heroEnabled: false })).toBeNull();
  });

  it('saves the ticker toggle and a trimmed closing line, leaving an empty language out', () => {
    const form = {
      ...menuLookFormFromTheme(DEFAULT_MENU_THEME),
      showTicker: true,
      closingEn: '  See you  ',
      closingAr: ' ',
    };
    const theme = menuThemeFromForm(form);
    expect(theme.showTicker).toBe(true);
    expect(theme.closingLine).toEqual({ en: 'See you' });
    expect(menuThemeSchema.safeParse(theme).success).toBe(true);
    expect(isMenuLookDirty(form, DEFAULT_MENU_THEME)).toBe(true);
  });

  it('parses a theme cached before the ticker and closing line existed', () => {
    const old = { preset: 'forest', layout: 'grid', hero: { enabled: false }, showSearch: true };
    const parsed = menuThemeSchema.parse(old);
    expect(parsed.showTicker).toBe(false);
    expect(parsed.closingLine).toEqual({});
  });

  it('saves a valid brand colour lower-cased, and leaves an empty one out', () => {
    const base = menuLookFormFromTheme(DEFAULT_MENU_THEME);
    expect(menuThemeFromForm({ ...base, brandColor: '#1F4A37' }).brandColor).toBe('#1f4a37');
    expect('brandColor' in menuThemeFromForm({ ...base, brandColor: '' })).toBe(false);
    expect(isMenuLookDirty({ ...base, brandColor: '#1f4a37' }, DEFAULT_MENU_THEME)).toBe(true);
  });

  it('asks for a valid colour when the brand colour is half typed', () => {
    const base = menuLookFormFromTheme(DEFAULT_MENU_THEME);
    expect(menuLookErrorKey({ ...base, brandColor: '#1f4' })).toBe('settings.menuLook.brandColorInvalid');
    expect(menuLookErrorKey({ ...base, brandColor: '#1f4a37' })).toBeNull();
    expect(menuLookErrorKey({ ...base, brandColor: '' })).toBeNull();
  });
});
