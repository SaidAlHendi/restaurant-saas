import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Spinner } from '@app/ui';

import { usePosDeviceLockRedirect } from '../pos/hooks/use-pos-device-lock-redirect.js';
import { AppShellView } from './components/AppShellView.js';
import { useAppShell } from './use-app-shell.js';

export function AppShellLayout() {
  usePosDeviceLockRedirect();
  const vm = useAppShell();
  return (
    <AppShellView {...vm}>
      {/* Lazy areas load inside the frame so the sidebar stays on screen. */}
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Spinner label={vm.labels.loading} />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppShellView>
  );
}
