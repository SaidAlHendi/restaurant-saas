import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

export type ProductTileProps = {
  name: string;
  priceLabel: string;
  imageUrl?: string | null;
  onPress: () => void;
  className?: string;
  badge?: ReactNode;
};

export function ProductTile({
  name,
  priceLabel,
  imageUrl,
  onPress,
  className,
  badge,
}: ProductTileProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        'flex min-h-12 flex-col overflow-hidden rounded-lg border bg-card text-start shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
            —
          </div>
        )}
        {badge ? <div className="absolute end-2 top-2">{badge}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-medium leading-snug">{name}</span>
        <span className="text-muted-foreground text-sm tabular-nums">{priceLabel}</span>
      </div>
    </button>
  );
}
