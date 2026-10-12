import { PosOrdersPageView } from '../../features/pos/components/PosOrdersPageView.js';
import { usePosDocument } from '../../features/pos/hooks/use-pos-document.js';
import { usePosOrdersPage } from '../../features/pos/hooks/use-pos-orders-page.js';

export default function PosOrdersPage() {
  usePosDocument();
  const vm = usePosOrdersPage();
  return <PosOrdersPageView {...vm} />;
}
