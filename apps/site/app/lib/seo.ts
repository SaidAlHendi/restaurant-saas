export type PageMetaInput = {
  title: string;
  description: string;
  canonical: string;
  locale: string;
  imageUrl?: string;
};

export function buildPageMeta(input: PageMetaInput) {
  return [
    { title: input.title },
    { name: 'description', content: input.description },
    { tagName: 'link', rel: 'canonical', href: input.canonical },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:locale', content: input.locale },
    ...(input.imageUrl ? [{ property: 'og:image', content: input.imageUrl }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
  ];
}

export function buildRestaurantJsonLd(input: {
  name: string;
  url: string;
  locale: string;
  menuItems: { name: string; priceMinor: number; currency: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: input.name,
    url: input.url,
    inLanguage: input.locale,
    hasMenu: {
      '@type': 'Menu',
      hasMenuSection: [
        {
          '@type': 'MenuSection',
          name: 'Menu',
          hasMenuItem: input.menuItems.map((item) => ({
            '@type': 'MenuItem',
            name: item.name,
            offers: {
              '@type': 'Offer',
              price: (item.priceMinor / 100).toFixed(2),
              priceCurrency: item.currency,
            },
          })),
        },
      ],
    },
  };
}
