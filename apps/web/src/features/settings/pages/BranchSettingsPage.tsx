import { Navigate } from 'react-router-dom';

import { BranchSettingsPageView } from '../components/BranchSettingsPageView.js';
import { NewBranchDialogView } from '../components/NewBranchDialogView.js';
import { useBranchSettingsPage } from '../hooks/use-branch-settings-page.js';
import { useNewBranchDialog } from '../hooks/use-new-branch-dialog.js';

export function BranchSettingsPage() {
  const vm = useBranchSettingsPage();
  const newBranch = useNewBranchDialog();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex w-full max-w-2xl justify-end">
        <NewBranchDialogView {...newBranch} />
      </div>
      <BranchSettingsPageView {...vm} />
    </div>
  );
}
