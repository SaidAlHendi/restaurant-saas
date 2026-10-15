import { Navigate } from 'react-router-dom';

import { BillingPageView } from '../components/BillingPageView.js';
import { useBillingPage } from '../hooks/use-billing-page.js';

export function BillingPage() {
  const vm = useBillingPage();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return <BillingPageView {...vm} />;
}
