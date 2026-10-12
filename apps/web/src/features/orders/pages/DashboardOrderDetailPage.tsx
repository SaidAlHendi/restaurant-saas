import { DashboardOrderDetailView } from '../components/DashboardOrderDetailView.js';
import { useDashboardOrderDetailPage } from '../hooks/use-dashboard-order-detail-page.js';

export default function DashboardOrderDetailPage() {
  const vm = useDashboardOrderDetailPage();
  return <DashboardOrderDetailView {...vm} />;
}
