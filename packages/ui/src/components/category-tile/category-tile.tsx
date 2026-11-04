import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';

export type CategoryTileProps = {
  label: string;
  /** e.g. "12 items". */
  countLabel?: string;
  icon?: ReactNode;
  active?: boolean;
  onPress: () => void;
  className?: string;
};

/** Category filter tile for the POS: icon, name and item count; the active one is highlighted. */
export function CategoryTile({
  label,
  countLabel,
  icon,
  active = false,
  onPress,
  className,
}: CategoryTileProps) {
  return (
    <button
      type="button"
      data-slot="category-tile"
      data-active={active}
      aria-pressed={active}
      onClick={onPress}
      className={cn(
        'group flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50',
        'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        focusRing,
        className,
      )}
    >
      {icon ? (
        <span aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="line-clamp-1">{label}</span>
      {countLabel ? (
        <span className="text-xs tabular-nums opacity-70">
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}
