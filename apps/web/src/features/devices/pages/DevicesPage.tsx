import { Navigate } from 'react-router-dom';

import { DevicesPageView } from '../components/DevicesPageView.js';
import { useDevicesPage } from '../hooks/use-devices-page.js';

export function DevicesPage() {
  const vm = useDevicesPage();
  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }
  return <DevicesPageView {...vm} />;
}
