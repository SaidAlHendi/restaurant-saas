import { PosPageView } from '../../features/pos/components/PosPageView.js';
import { usePosDocument } from '../../features/pos/hooks/use-pos-document.js';
import { usePosPage } from '../../features/pos/hooks/use-pos-page.js';

export default function PosPage() {
  usePosDocument();
  const vm = usePosPage();
  return <PosPageView {...vm} />;
}
