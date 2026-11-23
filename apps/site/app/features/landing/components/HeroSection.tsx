import { Button } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import { TABLET_IMAGE_SIZES } from '../landing.seo.js';
import { PhotoTile } from './PhotoTile.js';
import { Tile } from './Tile.js';

export type HeroSectionProps = {
  hero: LandingContent['hero'];
  photos: LandingContent['photos'];
  ctaHref: string;
};

/**
 * First screen, three rows whose column splits never line up (7|5, 4|8, 8|4), so no four tiles
 * meet at one corner: the promise with the trial button, the red tile over the plate, the shift
 * tile beside the cashier screen, then the dining room and the pass.
 */
export function HeroSection({ hero, photos, ctaHref }: HeroSectionProps) {
  return (
    <>
      <Tile tone="paper" className="lp-torn md:col-span-7 md:min-h-[clamp(560px,57vw,880px)]">
        <h1 className="lp-display lp-hero text-primary">{hero.h1}</h1>
        <div className="flex flex-col gap-5">
          <p className="max-w-[30em] text-lg md:text-xl">{hero.lead}</p>
          <Button asChild size="touch" className="h-14 w-full justify-start rounded-full px-6 text-base font-bold">
            <a href={ctaHref}>{hero.cta}</a>
          </Button>
        </div>
      </Tile>

      <div className="contents md:col-span-5 md:grid md:grid-rows-[auto_1fr] md:gap-2.5">
        <Tile tone="brand" className="lp-torn md:min-h-[300px]">
          <p aria-hidden className="lp-display lp-tilemark">
            {hero.wordmark}
          </p>
          <p className="max-w-[26em] text-base md:text-lg">{hero.body}</p>
        </Tile>
        <PhotoTile
          image="pasta"
          alt={photos.pasta.alt}
          sizes="(min-width: 768px) 40vw, 100vw"
          className="md:min-h-[260px]"
          focus="55% center"
        />
      </div>

      <Tile tone="highlight" className="lp-torn md:col-span-4 md:min-h-[clamp(480px,44vw,680px)]">
        <h2 className="lp-display lp-sub">{hero.tabletTitle}</h2>
        <div className="flex flex-col gap-5">
          <p className="max-w-[26em] text-base md:text-lg">{hero.tabletBody}</p>
          <ul className="grid gap-1.5 text-lg font-medium">
            {hero.points.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </Tile>
      <PhotoTile
        image="tablet"
        alt={photos.tablet.alt}
        sizes={TABLET_IMAGE_SIZES}
        className="aspect-[4/3] md:aspect-auto md:col-span-8 md:min-h-[clamp(480px,44vw,680px)]"
        focus="62% 55%"
        priority
      />

      <PhotoTile
        image="room"
        alt={photos.room.alt}
        sizes="(min-width: 768px) 66vw, 100vw"
        className="md:col-span-8 md:min-h-[clamp(380px,32vw,520px)]"
        focus="center 62%"
        caption={hero.roomCaption}
      />
      <PhotoTile
        image="pass"
        alt={photos.pass.alt}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="md:col-span-4 md:min-h-[clamp(380px,32vw,520px)]"
      />
    </>
  );
}
