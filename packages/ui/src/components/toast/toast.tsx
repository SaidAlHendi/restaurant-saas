import type * as React from 'react';
import { Toaster as Sonner } from 'sonner';

import type { Theme } from '../../hooks/use-theme.js';
import type { Direction } from '../../lib/direction.js';

export interface ToasterProps extends Omit<React.ComponentProps<typeof Sonner>, 'theme' | 'dir'> {
  /** Current app theme from useTheme(). */
  theme: Theme;
  dir: Direction;
}

/** Mount once near the root. Show toasts with `toast.success(t('saved'))`. */
export function Toaster({ theme, dir, position, ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme === 'forest' ? 'dark' : 'light'}
      dir={dir}
      // Top-center in both directions; the accent edge flips with `dir` (see globals.css).
      position={position ?? 'top-center'}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-lg)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
