import { Navigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectPermissions } from '../../session/session.selectors.js';
import { RestaurantSettingsPageView } from '../components/RestaurantSettingsPageView.js';
import { useRestaurantSettingsPage } from '../hooks/use-restaurant-settings-page.js';
import { defaultSettingsPath } from '../settings-tabs.utils.js';

export function RestaurantSettingsPage() {
  const can = useAppSelector(selectCan('org.manage'));
  const permissions = useAppSelector(selectPermissions);
  const vm = useRestaurantSettingsPage();

  if (!can) {
    return <Navigate to={defaultSettingsPath(permissions)} replace />;
  }

  return <RestaurantSettingsPageView {...vm} />;
}
