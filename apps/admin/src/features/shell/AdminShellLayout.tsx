'use client';

import type { ReactNode } from 'react';

import { AppShell, Spinner } from '@app/ui';

import { useAdminShell } from './use-admin-shell';

/** Wires the shared AppShell to the admin nav, theme, language and sign out. */
export function AdminShellLayout({ children }: { children: ReactNode }) {
  const { ready, loadingLabel, navGroups, ...shell } = useAdminShell();
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted">
        <Spinner label={loadingLabel} />
      </div>
    );
  }
  return (
    <AppShell
      {...shell}
      navGroups={navGroups.map((group) => ({
        ...group,
        items: group.items.map(({ icon: Icon, ...item }) => ({
          ...item,
          icon: <Icon aria-hidden />,
        })),
      }))}
    >
      {children}
    </AppShell>
  );
}
