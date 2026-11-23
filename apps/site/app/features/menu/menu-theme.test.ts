import { describe, expect, it } from 'vitest';

import { DEFAULT_MENU_THEME, menuThemeSchema } from '@app/shared';

import { menuThemeStyle } from './menu-theme.js';

describe('menuThemeStyle', () => {
  it('overrides nothing for the default look', () => {
    expect(menuThemeStyle(DEFAULT_MENU_THEME)).toEqual({});
  });

  it('derives primary and its readable text from the brand colour', () => {
    const style = menuThemeStyle(menuThemeSchema.parse({ preset: 'espresso', brandColor: '#2f6f4f' }));
    expect(style).toMatchObject({ '--primary': '#2f6f4f', '--primary-foreground': '#ffffff' });
  });
});
