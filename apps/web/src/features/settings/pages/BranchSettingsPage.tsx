import { BranchSettingsPageView } from '../components/BranchSettingsPageView.js';
import { useBranchSettingsPage } from '../hooks/use-branch-settings-page.js';

export function BranchSettingsPage() {
  const vm = useBranchSettingsPage();
  return <BranchSettingsPageView {...vm} />;
}
