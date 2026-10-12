import { ImageIcon, MinusIcon, PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';
import { IconButton } from '../icon-button/index.js';

export type ProductTileStepper = {
  /** Quantity of this product already in the cart (0 shows the stepper with 0). */
  quantity: number;
  onDecrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
};

export type ProductTileProps = {
  name: string;
  priceLabel: string;
  imageUrl?: string | null;
  /** Tap on the card (and on + when there is a stepper): add one or open the options. */
  onPress: () => void;
  className?: string;
  /** Top corner badge on the photo, e.g. "20% off". */
  badge?: ReactNode;
  /** Short line under the name, e.g. "Has options". */
  hint?: string;
  /** − quantity + row under the price (POS). */
  stepper?: ProductTileStepper;
};

/** Product card for the POS grid: photo, name, price and an optional quantity stepper. */
export function ProductTile({
  name,
  priceLabel,
  imageUrl,
  onPress,
  className,
  badge,
  hint,
  stepper,
}: ProductTileProps) {
  const inCart = stepper !== undefined && stepper.quantity > 0;
  return (
    <div
      data-slot="product-tile"
      data-in-cart={inCart}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition-colors',
        'data-[in-cart=true]:border-primary',
        className,
      )}
    >
      <button
        type="button"
        onClick={onPress}
        className={cn(
          'group flex flex-1 flex-col gap-3 p-2.5 text-start hover:bg-accent/40',
          focusRing,
        )}
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden className="size-8 opacity-40" />
            </span>
          )}
          {badge ? <span className="absolute start-2 top-2">{badge}</span> : null}
        </span>
        <span className="flex flex-1 flex-col gap-1 px-1">
          <span className="line-clamp-2 text-sm font-medium leading-snug">{name}</span>
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
          <span className="mt-auto text-base font-semibold text-primary tabular-nums">
            {priceLabel}
          </span>
        </span>
      </button>
      {stepper ? (
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
          <IconButton
            variant="outline"
            size="lg"
            className="rounded-full"
            label={stepper.decreaseLabel}
            icon={<MinusIcon />}
            disabled={stepper.quantity === 0}
            onClick={stepper.onDecrease}
          />
          <span
            className="min-w-8 text-center text-base font-semibold tabular-nums"
            aria-live="polite"
          >
            {stepper.quantity}
          </span>
          <IconButton
            variant="outline"
            size="lg"
            className="rounded-full"
            label={stepper.increaseLabel}
            icon={<PlusIcon />}
            onClick={onPress}
          />
        </div>
      ) : null}
    </div>
  );
}
