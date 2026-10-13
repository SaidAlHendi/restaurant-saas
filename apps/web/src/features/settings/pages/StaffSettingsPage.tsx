import { Navigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectPermissions } from '../../session/session.selectors.js';
import { StaffSettingsPageView } from '../components/StaffSettingsPageView.js';
import { useStaffSettingsPage } from '../hooks/use-staff-settings-page.js';
import { defaultSettingsPath } from '../settings-tabs.utils.js';

export function StaffSettingsPage() {
  const can = useAppSelector(selectCan('staff.read'));
  const permissions = useAppSelector(selectPermissions);
  const vm = useStaffSettingsPage();

  if (!can) {
    return <Navigate to={defaultSettingsPath(permissions)} replace />;
  }

  return <StaffSettingsPageView {...vm} />;
}
