import { PickupDisplayView } from '../../features/pickup-display/components/PickupDisplayView.js';
import { usePickupDisplayPage } from '../../features/pickup-display/hooks/use-pickup-display-page.js';

export default function DisplayPage() {
  const vm = usePickupDisplayPage();
  return <PickupDisplayView {...vm} />;
}
