import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrgLocaleContext } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { selectSessionOrg } from '../../session/session.selectors.js';

export function useCatalogOrg(): OrgLocaleContext & {
  defaultCurrency: string;
  uiLocale: string;
} {
  const org = useAppSelector(selectSessionOrg);
  const { i18n } = useTranslation();

  return useMemo(() => {
    const defaultLocale = org?.defaultLocale ?? 'en';
    const locales = org?.locales ?? ['en', 'ar'];
    return {
      defaultLocale,
      locales,
      defaultCurrency: org?.defaultCurrency ?? 'SAR',
      uiLocale: i18n.language,
    };
  }, [org, i18n.language]);
}
