import { Button } from '@app/ui';

import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useThanksPage } from '../hooks/use-thanks-page.js';
import { PhotoTile } from './PhotoTile.js';
import { SiteShell } from './SiteShell.js';
import { Tile } from './Tile.js';

export type ThanksPageProps = {
  locale: LandingLocale;
  tracking: TrackingIds;
  /** True only right after a real form submit. */
  leadSubmitted: boolean;
};

/** Conversion page: the only place the lead event fires (after consent). Kept out of search results. */
export function ThanksPage({ locale, tracking, leadSubmitted }: ThanksPageProps) {
  const vm = useThanksPage(locale, tracking, leadSubmitted);
  const { content } = vm;
  return (
    <SiteShell shell={vm.shell}>
      <Tile as="section" tone="brand" className="md:col-span-7 md:min-h-[560px]">
        <div>
          <h1 className="lp-display lp-stm">{content.heading}</h1>
          <p className="mt-4 max-w-[26em] text-lg">{content.body}</p>
        </div>
        <ul className="grid list-none gap-3 p-0 md:max-w-[26rem]">
          <li data-tone="cooking" className="lp-ticket">
            <p className="lp-display flex items-end justify-between gap-2 text-4xl leading-none">
              <span>{content.ticket.label}</span>
              <span className="text-xl">{content.ticket.status}</span>
            </p>
            <ol className="mt-3 list-none p-0 text-[17px]">
              {content.ticket.steps.map((step) => (
                <li key={step.qty} className="py-1">
                  <b className="text-secondary-foreground">{step.qty}</b> {step.name}
                </li>
              ))}
            </ol>
          </li>
        </ul>
        <Button asChild variant="secondary" size="touch" className="self-start">
          <a href={vm.shell.links.home}>{content.back}</a>
        </Button>
      </Tile>
      <PhotoTile
        image="pass"
        alt={content.photoAlt}
        sizes="(min-width: 768px) 40vw, 100vw"
        className="md:col-span-5 md:min-h-[560px]"
        focus="38% center"
        priority
      />
    </SiteShell>
  );
}
