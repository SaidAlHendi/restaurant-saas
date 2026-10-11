import { TablesPageView } from '../components/TablesPageView.js';
import { useTablesScreen } from '../hooks/use-tables-screen.js';

export function TablesPage() {
  const viewModel = useTablesScreen();
  return <TablesPageView {...viewModel} />;
}
