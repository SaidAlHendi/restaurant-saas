import { MoonIcon, SunIcon } from 'lucide-react';

import type { Theme } from '../../hooks/use-theme.js';
import { IconButton, type IconButtonProps } from '../icon-button/icon-button.js';

export interface ThemeToggleProps
  extends Omit<IconButtonProps, 'label' | 'icon' | 'onClick'> {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  /** Already translated: the label says what clicking will switch to. */
  labels: { light: string; dark: string };
}

export function ThemeToggle({ theme, onThemeChange, labels, ...props }: ThemeToggleProps) {
  const isDark = theme === 'forest';
  return (
    <IconButton
      data-slot="theme-toggle"
      label={isDark ? labels.light : labels.dark}
      icon={isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
      onClick={() => {
        onThemeChange(isDark ? 'cupcake' : 'forest');
      }}
      {...props}
    />
  );
}
