import { Button } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import { TABLET_IMAGE_SIZES } from '../landing.seo.js';
import { PhotoTile } from './PhotoTile.js';
import { Tile } from './Tile.js';

export type HeroSectionProps = {
  hero: LandingContent['hero'];
  photos: LandingContent['photos'];
};

/** First screen: the wordmark, the one-line promise, the tablet with the real cashier screen, two photos. */
export function HeroSection({ hero, photos }: HeroSectionProps) {
  return (
    <>
      <Tile tone="paper" className="md:col-span-7 md:min-h-[560px]">
        <p aria-hidden className="lp-display lp-word">
          {hero.wordmark}
        </p>
        <h1 className="lp-display lp-med">{hero.h1}</h1>
      </Tile>
      <Tile tone="brand" className="md:col-span-5 md:min-h-[560px]">
        <p className="lp-display lp-stm">{hero.statement}</p>
        <p className="max-w-[26em] text-base">{hero.body}</p>
        <Button asChild variant="secondary" size="touch" className="self-start">
          <a href="#trial">{hero.cta}</a>
        </Button>
      </Tile>

      <PhotoTile
        image="tablet"
        alt={photos.tablet.alt}
        caption={photos.tablet.caption}
        sizes={TABLET_IMAGE_SIZES}
        className="md:col-span-7 md:min-h-0 md:aspect-[2336/1744]"
        priority
      />
      <Tile tone="accent" className="md:col-span-5">
        <p className="lp-display lp-stm">{hero.tabletTitle}</p>
        <p className="max-w-[26em] text-base">{hero.tabletBody}</p>
      </Tile>

      <PhotoTile
        image="room"
        alt={photos.room.alt}
        caption={photos.room.caption}
        sizes="(min-width: 768px) 66vw, 100vw"
        className="md:col-span-8 md:min-h-[420px]"
        focus="center 62%"
      />
      <PhotoTile
        image="pasta"
        alt={photos.pasta.alt}
        caption={photos.pasta.caption}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="md:col-span-4 md:min-h-[420px]"
        focus="55% center"
      />
    </>
  );
}
