/** Page meta tags (title, description, canonical, Open Graph, Twitter, hreflang). No server-only imports. */
export type PageMetaInput = {
  title: string;
  description: string;
  canonical?: string;
  locale: string;
  imageUrl?: string;
  alternateLocales?: Array<{ locale: string; href: string }>;
};

export function buildPageMeta(input: PageMetaInput) {
  const tags: Array<Record<string, string>> = [
    { title: input.title },
    { name: 'description', content: input.description },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:locale', content: input.locale },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
  ];
  if (input.canonical !== undefined) {
    tags.push({ tagName: 'link', rel: 'canonical', href: input.canonical });
  }
  if (input.imageUrl) {
    tags.push({ property: 'og:image', content: input.imageUrl });
  }
  if (input.alternateLocales) {
    for (const alt of input.alternateLocales) {
      tags.push({
        tagName: 'link',
        rel: 'alternate',
        hrefLang: alt.locale,
        href: alt.href,
      });
    }
  }
  return tags;
}
