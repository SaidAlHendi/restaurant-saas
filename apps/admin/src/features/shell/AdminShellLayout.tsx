import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AppShell, Spinner } from '@app/ui';

import { useAdminShell } from './use-admin-shell.js';

export function AdminShellLayout() {
  const { loadingLabel, navGroups, ...shell } = useAdminShell();
  return (
    <AppShell
      {...shell}
      brandMark={<img src="/favicon.svg" alt="" className="size-9 shrink-0" />}
      navGroups={navGroups.map((group) => ({
        ...group,
        items: group.items.map(({ icon: Icon, ...item }) => ({
          ...item,
          icon: <Icon aria-hidden />,
        })),
      }))}
    >
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Spinner label={loadingLabel} />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
