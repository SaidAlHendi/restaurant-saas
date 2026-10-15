import type { FeatureKey } from '@app/shared';

import { UpgradeRequiredView } from '../components/UpgradeRequiredView.js';
import { useUpgradeRequired } from '../hooks/use-upgrade-required.js';

export function UpgradeRequiredPage({ feature }: { feature: FeatureKey }) {
  const vm = useUpgradeRequired(feature);
  return <UpgradeRequiredView {...vm} />;
}
