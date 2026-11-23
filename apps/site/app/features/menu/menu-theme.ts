import type { CSSProperties } from 'react';

import { heroText, menuThemeVars, type MenuTheme } from '@app/shared';

export function menuThemeStyle(theme: MenuTheme): CSSProperties {
  return menuThemeVars(theme);
}

export { heroText };
