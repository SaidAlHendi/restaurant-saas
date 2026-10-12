import { DashboardOrdersView } from '../components/DashboardOrdersView.js';
import { useDashboardOrdersPage } from '../hooks/use-dashboard-orders-page.js';

export default function DashboardOrdersPage() {
  const vm = useDashboardOrdersPage();
  return <DashboardOrdersView {...vm} />;
}
