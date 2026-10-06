import { useTranslation } from 'react-i18next';

export default function PosArea() {
  const { t } = useTranslation();
  return <p>{t('areas.pos')}</p>;
}
