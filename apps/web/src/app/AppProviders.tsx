import type { ReactNode } from 'react';

import { DirectionProvider, Toaster, TooltipProvider, useTheme } from '@app/ui';

import { useAppDirection } from '../lib/use-direction.js';

export function AppProviders({ children }: { children: ReactNode }) {
  const dir = useAppDirection();
  const { theme } = useTheme();
  return (
    <DirectionProvider dir={dir}>
      <TooltipProvider>
        {children}
        <Toaster theme={theme} dir={dir} />
      </TooltipProvider>
    </DirectionProvider>
  );
}
