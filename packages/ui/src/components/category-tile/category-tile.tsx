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
        'group flex min-h-20 min-w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card px-4 py-3 text-center shadow-xs transition-colors hover:bg-accent/50',
        'data-[active=true]:border-primary data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground',
        '[&_svg]:size-5 [&_svg]:shrink-0',
        focusRing,
        className,
      )}
    >
      {icon ? (
        <span className="text-primary group-data-[active=true]:text-current" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="line-clamp-1 text-sm font-semibold">{label}</span>
      {countLabel ? (
        <span className="text-xs text-muted-foreground tabular-nums group-data-[active=true]:text-current group-data-[active=true]:opacity-80">
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}
