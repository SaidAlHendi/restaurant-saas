import { Suspense, type ReactNode } from 'react';

import { AdminShellLayout } from '@/features/shell/AdminShellLayout';

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AdminShellLayout>{children}</AdminShellLayout>
    </Suspense>
  );
}
