import { isFeatureKey, isLimitKey } from '@app/shared';

import type { PlanFeatureRow } from './billing.repository';

export function featuresAndLimitsFromRows(rows: PlanFeatureRow[]): {
  features: string[];
  limits: Record<string, number | null>;
} {
  const features: string[] = [];
  const limits: Record<string, number | null> = {};

  for (const row of rows) {
    if (isLimitKey(row.featureKey)) {
      limits[row.featureKey] = row.limitValue;
    } else if (isFeatureKey(row.featureKey)) {
      features.push(row.featureKey);
    } else if (row.featureKey.startsWith('limit.')) {
      limits[row.featureKey] = row.limitValue;
    }
  }

  return { features, limits };
}
