import { LockIcon } from 'lucide-react';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AppShell, BannerAlert, Spinner } from '@app/ui';

import { usePosDeviceLockRedirect } from '../pos/hooks/use-pos-device-lock-redirect.js';
import { useAppShell } from './use-app-shell.js';

export function AppShellLayout() {
  usePosDeviceLockRedirect();
  const { banner, loadingLabel, lockedLabel, navGroups, moduleSwitch, ...shell } = useAppShell();
  return (
    <AppShell
      {...shell}
      banner={banner ? <BannerAlert {...banner} /> : null}
      moduleSwitch={
        moduleSwitch
          ? {
              ...moduleSwitch,
              currentIcon: <moduleSwitch.currentIcon aria-hidden />,
              options: moduleSwitch.options.map((option) => ({
                ...option,
                icon: <option.icon aria-hidden />,
              })),
            }
          : null
      }
      navGroups={navGroups.map((group) => ({
        ...group,
        items: group.items.map(({ icon: Icon, locked, ...item }) => ({
          ...item,
          icon: Icon ? (
            <Icon aria-hidden />
          ) : (
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
          ),
          badge: locked ? (
            <LockIcon aria-label={lockedLabel} className="my-0.5 size-3.5" />
          ) : undefined,
        })),
      }))}
    >
      {/* Lazy areas load inside the frame so the sidebar stays on screen. */}
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
