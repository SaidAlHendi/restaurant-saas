import { QrPrintLayoutView } from '../components/QrPrintLayoutView.js';
import { useQrPrintScreen } from '../hooks/use-qr-print-screen.js';

export function QrPrintPage() {
  const viewModel = useQrPrintScreen();
  return <QrPrintLayoutView {...viewModel} />;
}
