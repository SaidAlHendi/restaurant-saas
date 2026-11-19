import { Outlet } from 'react-router-dom';

import { AuthLayout } from '@app/ui';

import { AuthAside, AuthLiveTicket } from './AuthAside.js';
import { useGuestLayout } from './use-guest-layout.js';

/** Context the sign-in / sign-up pages can use to talk to the brand panel. */
export interface GuestOutletContext {
  setLiveName: (name: string) => void;
}

/** Sign in / sign up route frame: wires the shared AuthLayout to this app's hooks and router. */
export function GuestLayout() {
  const { liveName, setLiveName, ...guest } = useGuestLayout();
  return (
    <AuthLayout
      {...guest}
      aside={<AuthAside />}
      ticket={<AuthLiveTicket liveName={liveName} />}
      brandMark={<img src="/favicon.svg" alt="" className="size-9 shrink-0" />}>
      <Outlet context={{ setLiveName } satisfies GuestOutletContext} />
    </AuthLayout>
  );
}
