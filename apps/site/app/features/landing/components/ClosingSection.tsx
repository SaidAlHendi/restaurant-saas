import { Button } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import { PhotoTile } from './PhotoTile.js';
import { Tile } from './Tile.js';

export type ClosingSectionProps = {
  closing: LandingContent['closing'];
  wordmark: string;
  trialHref: string;
  photo: LandingContent['photos']['tiramisu'];
};

export function ClosingSection({ closing, wordmark, trialHref, photo }: ClosingSectionProps) {
  return (
    <>
      <Tile as="section" tone="ink" className="pb-0 md:col-span-8 md:min-h-[560px] md:pb-0">
        <div>
          <h2 className="lp-display lp-stm">{closing.title}</h2>
          <p className="mt-4 max-w-[26em] text-lg opacity-80">{closing.body}</p>
          <Button
            asChild
            size="touch"
            className="mt-7 bg-warning text-warning-foreground hover:bg-warning/85"
          >
            <a href={trialHref}>{closing.cta}</a>
          </Button>
        </div>
        <div aria-hidden data-word={wordmark} className="lp-display lp-ghost" />
      </Tile>
      <PhotoTile
        image="tiramisu"
        alt={photo.alt}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="md:col-span-4 md:min-h-[560px]"
      />
    </>
  );
}
