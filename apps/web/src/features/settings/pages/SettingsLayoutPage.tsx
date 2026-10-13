import { SettingsLayoutView } from '../components/SettingsLayoutView.js';
import { useSettingsLayout } from '../hooks/use-settings-layout.js';

export function SettingsLayoutPage() {
  const vm = useSettingsLayout();
  return <SettingsLayoutView {...vm} />;
}
