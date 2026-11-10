import type { LandingContent } from '../content/types.js';
import { Tile } from './Tile.js';

export type FaqSectionProps = {
  faq: LandingContent['faq'];
};

/** Native <details> disclosures: work without JavaScript and keep every answer in the HTML. */
export function FaqSection({ faq }: FaqSectionProps) {
  return (
    <>
      <Tile as="section" tone="paper" id="faq" className="md:col-span-4 md:row-span-2">
        <h2 className="lp-display lp-stm">{faq.title}</h2>
      </Tile>
      {faq.items.map((item, index) => (
        <details
          key={item.q}
          open={index === 0}
          className="relative col-span-12 rounded-[10px] bg-accent p-5 md:col-span-4 md:p-8"
        >
          <summary className="cursor-pointer list-none text-xl leading-snug font-medium marker:hidden [&::-webkit-details-marker]:hidden">
            {item.q}
          </summary>
          <p className="mt-2.5 max-w-[30em] text-base">{item.a}</p>
        </details>
      ))}
    </>
  );
}
