export function menuPath(
  locale: string,
  orgSlug: string,
  branchSlug?: string,
): string {
  const base = branchSlug === undefined
    ? `/${locale}/m/${orgSlug}`
    : `/${locale}/m/${orgSlug}/${branchSlug}`;
  return base;
}

export function menuCanonicalUrl(
  siteBaseUrl: string,
  locale: string,
  orgSlug: string,
  branchSlug?: string,
): string {
  return new URL(menuPath(locale, orgSlug, branchSlug), siteBaseUrl).toString();
}

export function parseMenuLocale(value: string | undefined): 'ar' | 'en' | null {
  if (value === 'ar' || value === 'en') {
    return value;
  }
  return null;
}
