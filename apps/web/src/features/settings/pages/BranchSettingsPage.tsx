import { Navigate } from 'react-router-dom';

import { BranchSettingsPageView } from '../components/BranchSettingsPageView.js';
import { useBranchSettingsPage } from '../hooks/use-branch-settings-page.js';

export function BranchSettingsPage() {
  const vm = useBranchSettingsPage();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return <BranchSettingsPageView {...vm} />;
}
