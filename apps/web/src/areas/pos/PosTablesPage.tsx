import { PosTablesPageView } from '../../features/pos/components/PosTablesPageView.js';
import { usePosTablesPage } from '../../features/pos/hooks/use-pos-tables-page.js';

export default function PosTablesPage() {
  const vm = usePosTablesPage();
  return <PosTablesPageView {...vm} />;
}
