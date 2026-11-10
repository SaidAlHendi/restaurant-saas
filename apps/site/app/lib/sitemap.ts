import { INDEXED_PAGE_KEYS, LANDING_LOCALES } from './locale.js';

const PAGES: Array<'' | (typeof INDEXED_PAGE_KEYS)[number]> = ['', ...INDEXED_PAGE_KEYS];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type SitemapEntry = { loc: string; alternates?: Array<{ hreflang: string; href: string }> };

function landingEntries(base: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const page of PAGES) {
    const url = (locale: string) => `${base}/${locale}${page === '' ? '' : `/${page}`}`;
    const alternates = [
      ...LANDING_LOCALES.map((locale) => ({ hreflang: locale, href: url(locale) })),
      { hreflang: 'x-default', href: url('ar') },
    ];
    for (const locale of LANDING_LOCALES) {
      entries.push({ loc: url(locale), alternates });
    }
  }
  return entries;
}

/**
 * sitemap.xml: the home, plans, FAQ, contact, privacy and terms pages in both locales with xhtml:link alternates,
 * then one entry per published restaurant menu. The thank-you page is intentionally absent.
 */
export function buildSitemapXml(
  siteBaseUrl: string,
  menus: Array<{ slug: string; locales: readonly string[] }>,
): string {
  const base = siteBaseUrl.replace(/\/$/, '');
  const entries: SitemapEntry[] = [
    ...landingEntries(base),
    ...menus.flatMap((menu) =>
      menu.locales.map((locale) => ({ loc: `${base}/${locale}/m/${menu.slug}` })),
    ),
  ];
  const body = entries
    .map((entry) => {
      const links = (entry.alternates ?? [])
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}"/>`,
        )
        .join('\n');
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${links === '' ? '' : `\n${links}`}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>`;
}

/** robots.txt: everything public is crawlable except the table QR redirects. */
export function buildRobotsTxt(siteBaseUrl: string): string {
  const base = siteBaseUrl.replace(/\/$/, '');
  // The thank-you page is kept out of results with noindex (meta + header). It must stay
  // crawlable, because a crawler can only obey noindex on a page it is allowed to fetch.
  return `User-agent: *\nAllow: /\nDisallow: /t/\n\nSitemap: ${base}/sitemap.xml\n`;
}
