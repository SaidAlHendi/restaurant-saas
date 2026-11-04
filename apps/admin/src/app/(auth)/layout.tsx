import type { ReactNode } from 'react';

import { GuestFrame } from '@/features/auth/GuestFrame';

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <GuestFrame>{children}</GuestFrame>;
}
