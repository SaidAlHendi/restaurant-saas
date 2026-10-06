import { useTranslation } from 'react-i18next';

export default function AuthArea() {
  const { t } = useTranslation();
  return <p>{t('areas.auth')}</p>;
}
