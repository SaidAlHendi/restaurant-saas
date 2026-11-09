import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { Spinner } from '@app/ui';

import { useAppSelector } from '../../app/hooks.js';
import { landingPathForPermissions } from './landing-path.js';
import { selectBootstrapDone, selectPermissions } from './session.selectors.js';

/** Sends a signed-in user to their own home screen (dashboard, cashier or kitchen). */
export function LandingRedirect() {
  const { t } = useTranslation();
  const bootstrapDone = useAppSelector(selectBootstrapDone);
  const permissions = useAppSelector(selectPermissions);

  if (!bootstrapDone) {
    return (
      <div className="flex justify-center p-8">
        <Spinner label={t('common.loading')} />
      </div>
    );
  }
  return <Navigate to={landingPathForPermissions(permissions)} replace />;
}
