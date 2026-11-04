'use client';

import type { ReactNode } from 'react';

import { AuthLayout } from '@app/ui';

import { useGuestFrame } from './use-guest-frame';

/** Sign-in frame: wires the shared AuthLayout to this app's theme and language. */
export function GuestFrame({ children }: { children: ReactNode }) {
  const guest = useGuestFrame();
  return <AuthLayout {...guest}>{children}</AuthLayout>;
}
