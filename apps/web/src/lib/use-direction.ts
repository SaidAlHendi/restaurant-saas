import { useTranslation } from 'react-i18next';

import type { Direction } from '@app/ui';

/** Text direction of the current language, for Radix DirectionProvider. */
export function useAppDirection(): Direction {
  const { i18n } = useTranslation();
  return i18n.dir(i18n.language);
}
