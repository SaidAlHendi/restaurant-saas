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
      // Bottom-end: right in English, left in Arabic.
      position={position ?? (dir === 'rtl' ? 'bottom-left' : 'bottom-right')}
      richColors
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--popover)',
          '--success-text': 'var(--foreground)',
          '--success-border': 'var(--success)',
          '--error-bg': 'var(--popover)',
          '--error-text': 'var(--foreground)',
          '--error-border': 'var(--destructive)',
          '--warning-bg': 'var(--popover)',
          '--warning-text': 'var(--foreground)',
          '--warning-border': 'var(--warning)',
          '--info-bg': 'var(--popover)',
          '--info-text': 'var(--foreground)',
          '--info-border': 'var(--info)',
          '--border-radius': 'var(--radius-md)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
