import './not-found-fonts.css';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@app/ui';

const DISPLAY = "'Lalezar', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif";
const TEXT = "'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif";

/** Shown for any URL that matches no route. Same look as the landing page (Lalezar display type, flat tiles). */
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-foreground p-2 text-foreground" style={{ fontFamily: TEXT }}>
      <main className="mx-auto grid max-w-[1600px] grid-cols-12 gap-2">
        <section className="col-span-12 flex flex-col justify-between gap-4 rounded-[10px] bg-primary p-5 text-primary-foreground md:col-span-7 md:min-h-[calc(100vh-1rem)] md:p-8">
          <div
            aria-hidden
            className="text-[clamp(110px,17vw,280px)] leading-[0.95]"
            style={{ fontFamily: DISPLAY }}
          >
            404
          </div>
          <div className="flex flex-col gap-4">
            <h1
              className="text-[clamp(36px,4.6vw,76px)] leading-[1.08]"
              style={{ fontFamily: DISPLAY, fontWeight: 400 }}
            >
              {t('notFoundPage.title')}
            </h1>
            <p className="max-w-[28em] text-lg">{t('notFoundPage.body')}</p>
            <Button asChild variant="secondary" size="touch" className="self-start">
              <Link to="/">{t('notFoundPage.home')}</Link>
            </Button>
          </div>
        </section>
        <section className="col-span-12 flex items-center justify-center rounded-[10px] bg-highlight p-5 md:col-span-5 md:p-8">
          <img
            src="/404-empty-plate.png"
            alt=""
            width={1168}
            height={880}
            className="h-auto w-full max-w-lg"
          />
        </section>
      </main>
    </div>
  );
}
