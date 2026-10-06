import { useTranslation } from 'react-i18next';

export default function KdsArea() {
  const { t } = useTranslation();
  return <p>{t('areas.kds')}</p>;
}
