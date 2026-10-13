import { Navigate } from 'react-router-dom';

import { StaffSettingsPageView } from '../components/StaffSettingsPageView.js';
import { useStaffSettingsPage } from '../hooks/use-staff-settings-page.js';

export function StaffSettingsPage() {
  const vm = useStaffSettingsPage();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return <StaffSettingsPageView {...vm} />;
}
