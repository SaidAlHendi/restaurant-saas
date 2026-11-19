import { Button } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import { Tile } from './Tile.js';

export type TeaserSectionProps = {
  teasers: LandingContent['teasers'];
  plansHref: string;
  faqHref: string;
};

/** Two tiles on the home page that lead to the plans and FAQ pages. */
export function TeaserSection({ teasers, plansHref, faqHref }: TeaserSectionProps) {
  return (
    <>
      <Tile as="section" tone="brand" className="md:col-span-6 md:min-h-[300px]">
        <h2 className="lp-display lp-stm">{teasers.plans.title}</h2>
        <p className="max-w-[26em] text-base">{teasers.plans.body}</p>
        <Button asChild variant="secondary" size="touch" className="self-start">
          <a href={plansHref}>{teasers.plans.cta}</a>
        </Button>
      </Tile>
      <Tile as="section" tone="accent" className="md:col-span-6 md:min-h-[300px]">
        <h2 className="lp-display lp-stm">{teasers.faq.title}</h2>
        <p className="max-w-[26em] text-base">{teasers.faq.body}</p>
        <Button asChild variant="outline" size="touch" className="self-start">
          <a href={faqHref}>{teasers.faq.cta}</a>
        </Button>
      </Tile>
    </>
  );
}
