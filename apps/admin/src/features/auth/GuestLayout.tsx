import { Outlet } from 'react-router-dom';

import { AuthLayout } from '@app/ui';

import { useGuestLayout } from './use-guest-layout.js';

/** Sign-in route frame: wires the shared AuthLayout to this app's hooks and router. */
export function GuestLayout() {
  const guest = useGuestLayout();
  return (
    <AuthLayout {...guest} brandMark={<img src="/favicon.svg" alt="" className="size-11 shrink-0" />}>
      <Outlet />
    </AuthLayout>
  );
}
