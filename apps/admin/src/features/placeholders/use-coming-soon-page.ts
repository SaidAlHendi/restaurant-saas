import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ADMIN_NAV } from '../shell/admin-nav.js';

export function useComingSoonPage() {
  const { t } = useTranslation();
  const { section } = useParams();
  const item = ADMIN_NAV.find((entry) => entry.id === section);
  return {
    title: item ? t(item.labelKey) : t('comingSoon.unknown'),
    heading: t('comingSoon.heading'),
    body: t('comingSoon.body'),
  };
}
