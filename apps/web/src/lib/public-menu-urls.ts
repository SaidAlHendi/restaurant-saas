export function publicSiteBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://localhost:5174';
}

export function buildPublicMenuUrl(
  orgSlug: string,
  locale: string,
  branchSlug?: string,
): string {
  const base = publicSiteBaseUrl();
  const encodedOrg = encodeURIComponent(orgSlug);
  const path =
    branchSlug === undefined
      ? `/${locale}/m/${encodedOrg}`
      : `/${locale}/m/${encodedOrg}/${encodeURIComponent(branchSlug)}`;
  return `${base}${path}`;
}

export function buildPublicTableUrl(token: string): string {
  return `${publicSiteBaseUrl()}/t/${encodeURIComponent(token)}`;
}
