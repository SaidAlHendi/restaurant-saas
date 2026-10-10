import { QrCodesPageView } from '../components/QrCodesPageView.js';
import { useQrCodesScreen } from '../hooks/use-qr-codes-screen.js';

export function QrCodesPage() {
  const viewModel = useQrCodesScreen();
  return <QrCodesPageView {...viewModel} />;
}
