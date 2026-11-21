import { Navigate } from 'react-router-dom';

import { RestaurantSettingsPageView } from '../components/RestaurantSettingsPageView.js';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard.js';
import { useRestaurantSettingsPage } from '../hooks/use-restaurant-settings-page.js';

export function RestaurantSettingsPage() {
  const vm = useRestaurantSettingsPage();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return (
    <>
      <UnsavedChangesGuard dirty={vm.dirty} />
      <RestaurantSettingsPageView {...vm} />
    </>
  );
}
