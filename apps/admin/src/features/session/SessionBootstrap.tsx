import type { ReactNode } from 'react';

import { useSessionBootstrap } from './use-session-bootstrap.js';

export function SessionBootstrap({ children }: { children: ReactNode }) {
  useSessionBootstrap();
  return children;
}
