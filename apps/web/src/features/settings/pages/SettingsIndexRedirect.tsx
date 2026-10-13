import { Navigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectPermissions } from '../../session/session.selectors.js';
import { defaultSettingsPath } from '../settings-tabs.utils.js';

export function SettingsIndexRedirect() {
  const permissions = useAppSelector(selectPermissions);
  return <Navigate to={defaultSettingsPath(permissions)} replace />;
}
