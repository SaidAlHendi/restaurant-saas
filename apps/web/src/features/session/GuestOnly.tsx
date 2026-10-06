import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { Spinner } from '@app/ui';

import { useAppSelector } from '../../app/hooks.js';
import { selectAccessToken, selectBootstrapDone } from './session.selectors.js';

export function GuestOnly({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const bootstrapDone = useAppSelector(selectBootstrapDone);
  const accessToken = useAppSelector(selectAccessToken);

  if (!bootstrapDone) {
    return (
      <div className="flex justify-center p-8">
        <Spinner label={t('common.loading')} />
      </div>
    );
  }

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
