import { Button } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import { Tile } from './Tile.js';

export type CtaSectionProps = {
  closing: LandingContent['closing'];
  href: string;
};

/** The closing call to action at the bottom of the plans and FAQ pages. */
export function CtaSection({ closing, href }: CtaSectionProps) {
  return (
    <Tile as="section" tone="ink" className="md:min-h-[300px]">
      <div>
        <h2 className="lp-display lp-stm">{closing.title}</h2>
        <p className="mt-4 max-w-[26em] text-lg opacity-80">{closing.body}</p>
      </div>
      <Button
        asChild
        size="touch"
        className="self-start bg-warning text-warning-foreground hover:bg-warning/85"
      >
        <a href={href}>{closing.cta}</a>
      </Button>
    </Tile>
  );
}
