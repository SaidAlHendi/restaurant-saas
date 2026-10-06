import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { Button } from '@app/ui';

export function App() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('app.title')}</h1>
        <Button type="button" variant="outline" size="sm">
          {t('app.placeholder')}
        </Button>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">{t('app.placeholder')}</p>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
