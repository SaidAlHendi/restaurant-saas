import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';
import { Badge, type OrderStatus } from '../badge/index.js';

export type OpenOrderChipProps = {
  /** Short code in the circle: table label or order number. */
  code: string;
  title: string;
  /** Second line, e.g. "3 items · 45.00 SAR". */
  detail?: string;
  statusLabel: string;
  status: OrderStatus;
  onPress: () => void;
  className?: string;
};

/** Compact open order card for the POS bottom strip. */
export function OpenOrderChip({
  code,
  title,
  detail,
  statusLabel,
  status,
  onPress,
  className,
}: OpenOrderChipProps) {
  return (
    <button
      type="button"
      data-slot="open-order-chip"
      onClick={onPress}
      className={cn(
        'flex min-h-16 w-60 shrink-0 items-center gap-3 rounded-xl border border-transparent bg-highlight px-3 py-2 text-start transition-colors hover:border-primary',
        focusRing,
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight-foreground text-sm font-bold text-highlight tabular-nums">
        <span className="line-clamp-1 px-1">{code}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{title}</span>
        {detail ? (
          <span className="truncate text-xs text-muted-foreground tabular-nums">{detail}</span>
        ) : null}
      </span>
      <Badge variant={status} className="shrink-0">
        {statusLabel}
      </Badge>
    </button>
  );
}
