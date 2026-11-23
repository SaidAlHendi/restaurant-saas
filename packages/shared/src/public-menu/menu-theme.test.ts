import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MENU_THEME,
  effectiveMenuTheme,
  isDefaultMenuTheme,
  menuThemeSchema,
  menuThemeVars,
  resolveThemeBrand,
} from './menu-theme.js';

describe('menu theme brand colour', () => {
  it('rejects values that are not #rrggbb', () => {
    for (const bad of ['red', '#fff', '1f4a37', '#1f4a3']) {
      expect(menuThemeSchema.safeParse({ brandColor: bad }).success).toBe(false);
    }
    expect(menuThemeSchema.safeParse({ brandColor: '#1F4A37' }).success).toBe(true);
  });

  it('derives primary colours from the brand colour, keeping the preset background', () => {
    const theme = menuThemeSchema.parse({ preset: 'forest', brandColor: '#8a1c1c' });
    const vars = menuThemeVars(theme);
    expect(vars['--primary']).toBe('#8a1c1c');
    expect(vars['--primary-foreground']).toBe('#ffffff');
    expect(vars['--background']).toBe('#f3eee2');
  });

  it('adjusts a colour that is too pale for the preset background', () => {
    const theme = menuThemeSchema.parse({ preset: 'forest', brandColor: '#f0e6c8' });
    expect(resolveThemeBrand(theme)?.adjusted).toBe(true);
    expect(menuThemeVars(theme)['--primary']).not.toBe('#f0e6c8');
  });

  it('leaves classic untouched without a brand colour', () => {
    expect(menuThemeVars(DEFAULT_MENU_THEME)).toEqual({});
  });
});

describe('plan gating helpers', () => {
  it('knows the default look, including after a parse', () => {
    expect(isDefaultMenuTheme(DEFAULT_MENU_THEME)).toBe(true);
    expect(isDefaultMenuTheme(menuThemeSchema.parse({ showSearch: true }))).toBe(false);
    expect(isDefaultMenuTheme(menuThemeSchema.parse({ brandColor: '#1f4a37' }))).toBe(false);
  });

  it('shows the saved theme only when the plan allows it', () => {
    const saved = menuThemeSchema.parse({ preset: 'midnight', showSearch: true });
    expect(effectiveMenuTheme(saved, true)).toBe(saved);
    expect(effectiveMenuTheme(saved, false)).toEqual(DEFAULT_MENU_THEME);
  });
});
