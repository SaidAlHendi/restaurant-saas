import { Button } from '@app/ui';

import { Tile } from './Tile.js';

export type NotFoundPageProps = { locale: 'ar' | 'en' };

const COPY = {
  en: {
    heading: "We can't find that page",
    body: "The page you're looking for doesn't exist or has moved. Let's get you back to the table.",
    back: 'Back to home',
    home: '/en',
  },
  ar: {
    heading: 'لم نجد هذه الصفحة',
    body: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها. دعنا نعدك إلى الطاولة.',
    back: 'العودة للرئيسية',
    home: '/ar',
  },
} as const;

/** 404 in the landing page look: dark frame, flat tiles, Lalezar display type. */
export function NotFoundPage({ locale }: NotFoundPageProps) {
  const copy = COPY[locale];
  return (
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="lp-root min-h-screen bg-foreground p-2 text-foreground"
    >
      <main className="mx-auto grid max-w-[1600px] grid-cols-12 gap-2">
        <Tile as="section" tone="brand" className="md:col-span-7 md:min-h-[calc(100vh-1rem)]">
          <div aria-hidden className="lp-display lp-word !text-primary-foreground">
            404
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="lp-display lp-stm">{copy.heading}</h1>
            <p className="max-w-[28em] text-lg">{copy.body}</p>
            <Button asChild variant="secondary" size="touch" className="self-start">
              <a href={copy.home}>{copy.back}</a>
            </Button>
          </div>
        </Tile>
        <Tile as="section" tone="highlight" className="items-center justify-center md:col-span-5">
          <img
            src="/404-empty-plate.png"
            alt=""
            width={1168}
            height={880}
            className="h-auto w-full max-w-lg"
          />
        </Tile>
      </main>
    </div>
  );
}
