import { DevUiView } from './DevUiView.js';
import { useDevUiPage } from './use-dev-ui-page.js';

export default function DevUiPage() {
  const vm = useDevUiPage();
  return <DevUiView {...vm} />;
}
