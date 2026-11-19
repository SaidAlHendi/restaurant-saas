import './not-found-fonts.css';
import './not-found.css';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@app/ui';

const DISPLAY = "'Lalezar', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif";
const TEXT = "'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif";
const displayStyle = { fontFamily: DISPLAY, fontWeight: 400 } as const;

/** Shown for any URL that matches no route. Same look as the site's 404: kitchen ticket on a paprika tile. */
export default function NotFoundPage() {
  const { t } = useTranslation();
  const lines = [
    { name: t('notFoundPage.line1'), note: null },
    { name: t('notFoundPage.line2'), note: t('notFoundPage.served') },
    { name: t('notFoundPage.line3'), note: t('notFoundPage.onUs') },
  ];
  return (
    <div className="h-[100dvh] overflow-hidden bg-foreground p-2 text-foreground" style={{ fontFamily: TEXT }}>
      <main className="relative mx-auto flex h-[calc(100dvh-1rem)] max-w-[1600px] flex-col justify-between gap-4 overflow-hidden rounded-[10px] bg-primary p-5 text-primary-foreground md:p-8">
        <div aria-hidden className="nf-ghost" style={displayStyle}>
          404
        </div>
        <div className="relative z-10 max-w-[26em]">
          <h1 className="text-[clamp(28px,min(4.6vw,7dvh),76px)] leading-[1.1]" style={displayStyle}>
            {t('notFoundPage.title')}
          </h1>
          <p className="mt-3 max-w-[28em] text-lg">{t('notFoundPage.body')}</p>
          <Button asChild variant="secondary" size="touch" className="mt-6">
            <Link to="/">{t('notFoundPage.home')}</Link>
          </Button>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-0 flex-1 gap-4 pb-2 md:flex-row md:justify-between md:gap-6 md:pb-4">
          <div
            className="nf-ticket"
            role="img"
            aria-label={`${t('notFoundPage.order')}: ${t('notFoundPage.stamp')}`}
          >
            <div className="flex justify-between text-sm opacity-70">
              <span>SAHTAIN</span>
              <span>{t('notFoundPage.table')}</span>
            </div>
            <div className="mt-2 text-[clamp(28px,2.8vw,44px)] leading-[1.15]" style={displayStyle}>
              {t('notFoundPage.order')}
            </div>
            <div className="mt-3">
              {lines.map((line) => (
                <div key={line.name} className="nf-row">
                  <span>{line.name}</span>
                  {line.note === null ? (
                    <span className="nf-stamp" style={displayStyle}>
                      {t('notFoundPage.stamp')}
                    </span>
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
            className="nf-plate h-auto max-h-[26dvh] w-auto md:max-h-[40dvh]"
          />
        </div>
      </main>
    </div>
  );
}
