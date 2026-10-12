import { DashboardTodayView } from '../components/DashboardTodayView.js';
import { useDashboardTodayPage } from '../hooks/use-dashboard-today-page.js';

export default function DashboardTodayPage() {
  const vm = useDashboardTodayPage();
  return <DashboardTodayView {...vm} />;
}
