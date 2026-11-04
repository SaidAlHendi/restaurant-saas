'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { ADMIN_NAV_ITEMS } from '../shell/nav-items';

export function useComingSoonPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const page = useSearchParams().get('page');
  const item = ADMIN_NAV_ITEMS.find((candidate) => candidate.id === page);
  const pageName = item ? t(item.labelKey) : t('comingSoon.title');
  return {
    title: pageName,
    heading: t('comingSoon.title'),
    description: t('comingSoon.description', { page: pageName }),
    backLabel: t('comingSoon.back'),
    onBack: () => {
      router.push('/');
    },
  };
}
