import { Navigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectPermissions } from '../../session/session.selectors.js';
import { BranchSettingsPageView } from '../components/BranchSettingsPageView.js';
import { useBranchSettingsPage } from '../hooks/use-branch-settings-page.js';
import { defaultSettingsPath } from '../settings-tabs.utils.js';

export function BranchSettingsPage() {
  const can = useAppSelector(selectCan('branches.manage'));
  const permissions = useAppSelector(selectPermissions);
  const vm = useBranchSettingsPage();

  if (!can) {
    return <Navigate to={defaultSettingsPath(permissions)} replace />;
  }

  return <BranchSettingsPageView {...vm} />;
}
