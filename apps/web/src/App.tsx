import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';

import { Button, Spinner } from '@app/ui';

import { useAppSelector } from './app/hooks.js';
import { selectSessionUser } from './features/session/session.selectors.js';

export function App() {
  const { t } = useTranslation();
  const user = useAppSelector(selectSessionUser);

  return (
    <div className="min-h-dvh p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('app.title')}</h1>
        <nav className="flex items-center gap-2">
          {user ? (
            <span className="text-muted-foreground text-sm">{user.email}</span>
          ) : (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/login">{t('auth.login.nav')}</Link>
            </Button>
          )}
        </nav>
      </header>
      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <Spinner label={t('common.loading')} />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
