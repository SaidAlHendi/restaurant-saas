import type { LandingContent } from '../content/types.js';
import { PhotoTile } from './PhotoTile.js';
import { Tile } from './Tile.js';

export type KitchenSectionProps = {
  kitchen: LandingContent['kitchen'];
  photo: LandingContent['photos']['pass'];
};

/** Kitchen tickets on an espresso rail, next to the photo of the pass. */
export function KitchenSection({ kitchen, photo }: KitchenSectionProps) {
  return (
    <>
      <Tile as="section" tone="ink" id="kitchen" className="md:col-span-8 md:min-h-[560px]">
        <h2 className="lp-display lp-stm">{kitchen.title}</h2>
        <ul className="grid list-none gap-3 p-0 md:grid-cols-3">
          {kitchen.tickets.map((ticket) => (
            <li key={ticket.number} data-tone={ticket.tone} className="lp-ticket">
              <small className="text-sm text-foreground/75">{ticket.meta}</small>
              <p className="lp-display mt-2 flex items-end justify-between gap-2 text-4xl leading-none">
                <span>{ticket.number}</span>
                <span className="text-xl">{ticket.status}</span>
              </p>
              <ul className="mt-3 list-none p-0 text-[17px]">
                {ticket.items.map((item) => (
                  <li key={item.name} className="py-1">
                    <b className="text-secondary-foreground">{item.qty}</b> {item.name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Tile>
      <PhotoTile
        image="pass"
        alt={photo.alt}
        caption={photo.caption}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="md:col-span-4 md:min-h-[560px]"
        focus="38% center"
      />
    </>
  );
}
