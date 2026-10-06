import { useTranslation } from 'react-i18next';

export default function DashboardArea() {
  const { t } = useTranslation();
  return <p>{t('areas.dashboard')}</p>;
}
