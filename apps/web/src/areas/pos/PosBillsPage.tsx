import { PosBillsPageView } from '../../features/pos/components/PosBillsPageView.js';
import { usePosBillsPage } from '../../features/pos/hooks/use-pos-bills-page.js';

export default function PosBillsPage() {
  const vm = usePosBillsPage();
  return <PosBillsPageView {...vm} />;
}
