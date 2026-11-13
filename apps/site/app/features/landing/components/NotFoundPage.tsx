import { Button } from '@app/ui';

export type NotFoundPageProps = { locale: 'ar' | 'en' };

const COPY = {
  en: {
    table: 'TABLE 404',
    order: 'Order #404',
    lines: [
      { name: '1× The page you asked for', note: 'stamp' },
      { name: '1× A little patience', note: 'served' },
      { name: '1× Way back home', note: 'on us' },
    ],
    stamp: "86'd",
    heading: 'Sorry, we ran out of this page',
    body: "The kitchen is out of what you ordered. It may have moved, or it was never on the menu.",
    back: 'Back to the menu',
    home: '/en',
  },
  ar: {
    table: 'طاولة 404',
    order: 'طلب رقم 404',
    lines: [
      { name: '١× الصفحة التي طلبتها', note: 'stamp' },
      { name: '١× القليل من الصبر', note: 'قُدّم' },
      { name: '١× الطريق إلى الرئيسية', note: 'علينا' },
    ],
    stamp: 'نفدت',
    heading: 'عذراً، نفدت هذه الصفحة',
    body: 'المطبخ لا يملك ما طلبته. ربما انتقلت إلى مكان آخر، أو لم تكن في القائمة أصلاً.',
    back: 'العودة للرئيسية',
    home: '/ar',
  },
} as const;

/** 404 in the landing page look: dark frame, paprika tile, kitchen ticket, Lalezar display type. */
export function NotFoundPage({ locale }: NotFoundPageProps) {
  const copy = COPY[locale];
  return (
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="lp-root min-h-screen bg-foreground p-2 text-foreground"
    >
      <main className="relative mx-auto flex min-h-[calc(100vh-1rem)] max-w-[1600px] flex-col justify-between gap-8 overflow-hidden rounded-[10px] bg-primary p-5 text-primary-foreground md:p-10">
        <div aria-hidden className="lp-display nf-ghost">
          404
        </div>
        <div className="relative z-10 max-w-[18em]">
          <h1 className="lp-display lp-stm">{copy.heading}</h1>
          <p className="mt-3 max-w-[28em] text-lg">{copy.body}</p>
          <Button asChild variant="secondary" size="touch" className="mt-6">
            <a href={copy.home}>{copy.back}</a>
          </Button>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-6 pb-10 md:flex-row md:justify-around md:pb-24">
          <div className="nf-ticket" role="img" aria-label={`${copy.order}: ${copy.stamp}`}>
            <div className="flex justify-between text-sm opacity-70">
              <span>SAHTAIN</span>
              <span>{copy.table}</span>
            </div>
            <div className="lp-display lp-med mt-2">{copy.order}</div>
            <div className="mt-3">
              {copy.lines.map((line) => (
                <div key={line.name} className="nf-row">
                  <span>{line.name}</span>
                  {line.note === 'stamp' ? (
                    <span className="nf-stamp lp-display">{copy.stamp}</span>
                  ) : (
                    <span>{line.note}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <img
            src="/404-empty-plate.png"
            alt=""
            width={1168}
            height={880}
            className="nf-plate h-auto"
          />
        </div>
      </main>
    </div>
  );
}
