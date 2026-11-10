import { Button } from '@app/ui';

import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useThanksPage } from '../hooks/use-thanks-page.js';
import { SiteShell } from './SiteShell.js';
import { Tile } from './Tile.js';

export type ThanksPageProps = {
  locale: LandingLocale;
  tracking: TrackingIds;
};

/** Conversion page: the only place the lead event fires (after consent). Kept out of search results. */
export function ThanksPage({ locale, tracking }: ThanksPageProps) {
  const vm = useThanksPage(locale, tracking);
  return (
    <SiteShell shell={vm.shell}>
      <Tile as="section" tone="brand" className="md:min-h-[420px]">
        <h1 className="lp-display lp-stm">{vm.content.heading}</h1>
        <p className="max-w-[28em] text-lg">{vm.content.body}</p>
        <Button asChild variant="secondary" size="touch" className="self-start">
          <a href={vm.shell.links.home}>{vm.content.back}</a>
        </Button>
      </Tile>
    </SiteShell>
  );
}
