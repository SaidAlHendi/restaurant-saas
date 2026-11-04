'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { DirectionProvider, Toaster, useTheme } from '@app/ui';

import '@/lib/i18n';
import { useAppDirection } from '@/lib/use-app-direction';
import { useLanguageRestore } from '@/lib/use-language-restore';

function Frame({ children }: { children: ReactNode }) {
  useLanguageRestore();
  const dir = useAppDirection();
  const { theme } = useTheme();
  return (
    <DirectionProvider dir={dir}>
      {children}
      <Toaster theme={theme} dir={dir} />
    </DirectionProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <Frame>{children}</Frame>
    </QueryClientProvider>
  );
}
