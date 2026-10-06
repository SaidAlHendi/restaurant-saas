import { useTranslation } from 'react-i18next';

export default function AdminArea() {
  const { t } = useTranslation();
  return <p>{t('areas.admin')}</p>;
}
