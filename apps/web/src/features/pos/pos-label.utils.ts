import { pickLocalizedText, type LocalizedText } from '@app/shared';

export function posLocalizedName(
  value: LocalizedText,
  locale: string,
  defaultLocale: string,
): string {
  return pickLocalizedText(value, locale, defaultLocale);
}
