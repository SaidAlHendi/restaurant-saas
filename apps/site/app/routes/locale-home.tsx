import { buildPageMeta } from '../lib/seo.js';

export function loader({ params }: { params: { locale?: string } }) {
  const locale = params.locale;
  if (locale !== 'ar' && locale !== 'en') {
    throw new Response('Not Found', { status: 404 });
  }
  return { locale };
}

export function meta({ data: loaderData }: { data?: { locale: string } }) {
  const locale = loaderData?.locale ?? 'en';
  const isAr = locale === 'ar';
  return buildPageMeta({
    title: isAr ? 'مطاعم SaaS' : 'Restaurant SaaS',
    description: isAr
      ? 'قوائم رقمية وعمليات للمطاعم الحديثة.'
      : 'Digital menus and operations for modern restaurants.',
    canonical: `https://example.com/${locale}`,
    locale,
  });
}

export default function LocaleHome({ loaderData }: { loaderData: { locale: string } }) {
  const isAr = loaderData.locale === 'ar';
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">{isAr ? 'مطاعم SaaS' : 'Restaurant SaaS'}</h1>
      <p className="mt-2 text-muted-foreground">
        {isAr ? 'صفحة تسويقية (معروضة مسبقاً).' : 'Marketing page (prerendered).'}
      </p>
    </main>
  );
}
