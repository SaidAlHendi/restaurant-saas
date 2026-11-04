import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { Spinner } from '@app/ui';

export function App() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner label={t('common.loading')} />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
