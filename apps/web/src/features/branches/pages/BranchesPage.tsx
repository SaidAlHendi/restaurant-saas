import { Navigate } from 'react-router-dom';

import { BranchesPageView } from '../components/BranchesPageView.js';
import { useBranchesPage } from '../hooks/use-branches-page.js';
import { useNewBranchDialog } from '../hooks/use-new-branch-dialog.js';

export function BranchesPage() {
  const vm = useBranchesPage();
  const newBranch = useNewBranchDialog();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return <BranchesPageView {...vm} newBranch={newBranch} />;
}
