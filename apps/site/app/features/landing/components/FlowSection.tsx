import { cn } from '@app/ui';

import type { FlowMedia, LandingContent } from '../content/types.js';
import type { LandingPageViewModel } from '../hooks/use-landing-page.js';
import { imageUrl } from '../landing.utils.js';
import { Picture } from './Picture.js';
import { Tile } from './Tile.js';

export type FlowSectionProps = {
  flow: LandingContent['flow'];
  curve: LandingPageViewModel['curve'];
};

function FlowMediaView({ media }: { media: FlowMedia }) {
  if (media.kind === 'image') {
    return (
      <Picture
        name={media.image}
        alt={media.alt}
        sizes="(min-width: 768px) 46vw, 92vw"
        className="block aspect-[8/5] h-auto w-full rounded-[11px] bg-accent object-cover object-top"
      />
    );
  }
  return (
    <video
      data-autoplay
      muted
      loop
      playsInline
      preload="none"
      poster={imageUrl(media.poster, 800, 'webp')}
      width={1280}
      height={800}
      aria-label={media.label}
      className="block aspect-[8/5] h-auto w-full rounded-[11px] bg-accent object-cover"
    >
      <source src={`/landing/video/${media.video}-ar.webm`} type="video/webm" />
    </video>
  );
}

/** The day in six real screens, joined by one curved line that draws as you scroll. */
export function FlowSection({ flow, curve }: FlowSectionProps) {
  return (
    <Tile as="section" tone="paper" id="flow" className="md:p-[clamp(28px,5vw,72px)]">
      <div>
        <span className="mb-3.5 inline-block rounded-lg bg-accent px-3 py-0.5 text-sm font-medium text-secondary-foreground">
          {flow.tag}
        </span>
        <h2 className="lp-display lp-stm">{flow.title}</h2>
        <p className="mt-3 max-w-[32em] text-base text-foreground/75">{flow.lead}</p>

        <div ref={curve.sectionRef} className="relative mt-[clamp(30px,5vw,70px)]">
          <svg
            ref={curve.svgRef}
            aria-hidden
            preserveAspectRatio="none"
            className="lp-curve-svg pointer-events-none absolute inset-0 z-0 size-full overflow-visible"
          >
            <path ref={curve.pathRef} pathLength={1} className="lp-curve-path" />
          </svg>

          {flow.stops.map((stop, index) => {
            const flipped = index % 2 === 1;
            return (
              <div
                key={stop.title}
                data-reveal
                className={cn(
                  'relative z-10 mb-[clamp(60px,9vw,130px)] grid items-center gap-[clamp(24px,5vw,80px)] last:mb-0',
                  flipped ? 'md:grid-cols-[1.25fr_1fr]' : 'md:grid-cols-[1fr_1.25fr]',
                )}
              >
                <div className={cn(flipped && 'md:order-2')}>
                  <span className="mb-3.5 inline-block rounded-lg bg-accent px-3 py-0.5 text-sm font-medium text-secondary-foreground">
                    {stop.tag}
                  </span>
                  <h3 className="text-[clamp(24px,2.6vw,38px)] leading-tight font-medium">
                    {stop.title}
                  </h3>
                  <p className="mt-2.5 max-w-[24em] text-foreground/75">{stop.body}</p>
                </div>
                <div data-curve-card className="rounded-[20px] bg-card p-2.5 shadow-[0_24px_50px_-28px_rgba(43,31,28,0.5)]">
                  <FlowMediaView media={stop.media} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Tile>
  );
}
