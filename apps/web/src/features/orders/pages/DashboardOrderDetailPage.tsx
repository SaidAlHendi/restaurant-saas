import { DashboardOrderDetailView } from '../components/DashboardOrderDetailView.js';
import { useDashboardOrderActions } from '../hooks/use-dashboard-order-actions.js';
import { useDashboardOrderDetailPage } from '../hooks/use-dashboard-order-detail-page.js';

export default function DashboardOrderDetailPage() {
  const actions = useDashboardOrderActions();
  const vm = useDashboardOrderDetailPage({
    voidAction: actions.voidAction,
    tableLabel: actions.tableLabel,
  });
  return <DashboardOrderDetailView {...vm} actions={actions} />;
}
