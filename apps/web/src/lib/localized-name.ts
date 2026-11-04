const ARABIC_SCRIPT = /[؀-ۿ]/;

/**
 * Names are often stored bilingually as "Arabic / English" (or the reverse). Shows only the half
 * written in the UI language so mixed-direction text does not scramble headers and sidebars.
 * Names without a " / " separator, or without one half per script, are returned unchanged.
 */
export function localizedName(name: string, language: string): string {
  const parts = name.split(' / ').map((part) => part.trim());
  if (parts.length !== 2) {
    return name;
  }
  const [first = '', second = ''] = parts;
  const firstIsArabic = ARABIC_SCRIPT.test(first);
  if (firstIsArabic === ARABIC_SCRIPT.test(second)) {
    return name;
  }
  const arabicPart = firstIsArabic ? first : second;
  const otherPart = firstIsArabic ? second : first;
  return language.startsWith('ar') ? arabicPart : otherPart;
}
