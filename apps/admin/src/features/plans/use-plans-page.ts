import { useTranslation } from 'react-i18next';

import { useListPlansQuery } from './plans.api.js';

/** View model for the read-only plans table. */
export function usePlansPage() {
  const { t, i18n } = useTranslation();
  const { data, isFetching, isError, refetch } = useListPlansQuery(undefined);
  const plans = data?.items ?? [];

  /** Every feature key used by any plan, so each plan row has the same columns. */
  const featureKeys = [...new Set(plans.flatMap((p) => p.features.map((f) => f.key)))].sort();

  return {
    t,
    plans,
    featureKeys,
    isLoading: isFetching && !data,
    isError,
    /** Readable, translated name for a feature key (falls back to the raw key). */
    featureName: (key: string) =>
      t(`plans.feature.${key.replaceAll('.', '_')}`, { defaultValue: key }),
    retry: () => void refetch(),
    formatPrice: (priceMinor: number, currency: string) => {
      try {
        return new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(
          priceMinor / 100,
        );
      } catch {
        return `${(priceMinor / 100).toFixed(2)} ${currency}`;
      }
    },
    /** Limit text for one plan and feature: a number, unlimited (null limit), or not included. */
    featureLabel: (limits: Map<string, number | null>, key: string) => {
      if (!limits.has(key)) return null;
      const limit = limits.get(key);
      return limit === null || limit === undefined
        ? t('plans.unlimited')
        : new Intl.NumberFormat(i18n.language).format(limit);
    },
  };
}
