import { KdsPageView } from '../../features/kds/components/KdsPageView.js';
import { useKdsDocument } from '../../features/kds/hooks/use-kds-document.js';
import { useKdsPage } from '../../features/kds/hooks/use-kds-page.js';

export default function KdsPage() {
  useKdsDocument();
  const vm = useKdsPage();
  return <KdsPageView {...vm} />;
}
