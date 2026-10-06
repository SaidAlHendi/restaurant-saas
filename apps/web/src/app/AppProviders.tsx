import type { ReactNode } from 'react';

import { DirectionProvider } from '@app/ui';

import { useAppDirection } from '../lib/use-direction.js';

export function AppProviders({ children }: { children: ReactNode }) {
  const dir = useAppDirection();
  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
