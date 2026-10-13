import { Navigate } from 'react-router-dom';

import { RestaurantSettingsPageView } from '../components/RestaurantSettingsPageView.js';
import { useRestaurantSettingsPage } from '../hooks/use-restaurant-settings-page.js';

export function RestaurantSettingsPage() {
  const vm = useRestaurantSettingsPage();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return <RestaurantSettingsPageView {...vm} />;
}
