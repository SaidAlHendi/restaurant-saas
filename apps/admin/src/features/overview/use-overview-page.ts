import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../app/hooks.js';
import { selectAdmin } from '../session/session.selectors.js';
import { useGetOverviewQuery } from './overview.api.js';

/** Minor units to a currency string; falls back to "CODE amount" for unknown codes. */
function formatMinor(locale: string, amountMinor: number, currency: string): string {
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amountMinor / 10 ** digits);
  } catch {
    return `${currency} ${String(amountMinor / 100)}`;
  }
}

export function useOverviewPage() {
  const { t, i18n } = useTranslation();
  const admin = useAppSelector(selectAdmin);
  const { data, isLoading, isError, refetch } = useGetOverviewQuery(undefined);
  const locale = i18n.language;

  const format = useMemo(() => {
    const number = new Intl.NumberFormat(locale);
    const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
    return {
      number: (n: number) => number.format(n),
      percent: (n: number) => percent.format(n),
      money: (minor: number, currency: string) => formatMinor(locale, minor, currency),
    };
  }, [locale]);

  const mrr = data
    ? data.mrr.length > 0
      ? data.mrr.map((m) => format.money(m.amountMinor, m.currency)).join(' + ')
      : format.number(0)
    : '';

  return {
    t,
    title: t('overview.title'),
    welcome: admin ? t('overview.welcome', { name: admin.name }) : '',
    data,
    isLoading,
    isError,
    retry: () => void refetch(),
    format,
    mrr,
  };
}
