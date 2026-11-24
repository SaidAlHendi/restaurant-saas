import { Button } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import { PhotoTile } from './PhotoTile.js';
import { Tile } from './Tile.js';

export type FaqSectionProps = {
  faq: LandingContent['faq'];
  photo: LandingContent['photos']['pasta'];
  /** Where the "contact us" button goes. */
  contactHref: string;
  contactLabel: string;
};

const TONES = ['new', 'cooking', 'ready'] as const;

/**
 * Every question is a kitchen ticket on the espresso rail. Native <details> disclosures: they work
 * without JavaScript and keep every answer in the HTML.
 */
export function FaqSection({ faq, photo, contactHref, contactLabel }: FaqSectionProps) {
  return (
    <>
      <Tile as="section" tone="brand" className="md:col-span-8 md:min-h-[440px]">
        <div>
          <h1 className="lp-display lp-hero">{faq.title}</h1>
          <p className="mt-5 max-w-[26em] text-lg">{faq.lead}</p>
        </div>
        <Button asChild variant="secondary" size="touch" className="self-start">
          <a href={contactHref}>{contactLabel}</a>
        </Button>
      </Tile>
      <PhotoTile
        image="pasta"
        alt={photo.alt}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="md:col-span-4 md:min-h-[440px]"
      />
      <Tile as="section" tone="ink" className="gap-0">
        <ul className="m-0 list-none gap-3 p-0 [column-gap:0.75rem] md:columns-2 xl:columns-3">
          {faq.items.map((item, index) => (
            <li key={item.q} className="mb-3 break-inside-avoid">
              <details
                open={index === 0}
                data-tone={TONES[index % TONES.length]}
                className="lp-ticket group"
              >
                <summary className="cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="lp-display flex items-center justify-between gap-3 text-2xl leading-none text-foreground/70">
                    <span>#{index + 1}</span>
                    <span
                      aria-hidden
                      className="relative size-8 shrink-0 rounded-full bg-foreground text-background before:absolute before:top-1/2 before:left-1/2 before:h-0.5 before:w-3 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-current after:absolute after:top-1/2 after:left-1/2 after:h-3 after:w-0.5 after:-translate-x-1/2 after:-translate-y-1/2 after:bg-current after:transition-transform group-open:after:scale-y-0"
                    />
                  </span>
                  <span className="lp-display mt-3 block text-[26px] leading-[1.15]">{item.q}</span>
                </summary>
                <p className="mt-3 text-[17px] leading-relaxed">{item.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </Tile>
    </>
  );
}
