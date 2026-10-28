import { CheckIcon } from 'lucide-react';

import { Badge } from '../badge/index.js';
import { Button } from '../button/index.js';
import { cn } from '../../lib/cn.js';
import { AgeTimer, type AgeLevel } from './age-timer.js';

export type KdsOrderCardItem = {
  id: string;
  quantity: number;
  name: string;
  modifiers: string[];
  note?: string | null;
  isReady: boolean;
  isAddition: boolean;
  isVoided: boolean;
  voidReason?: string | null;
  /** Undefined = item cannot be toggled (voided, or order not editable). */
  onToggle?: () => void;
};

export type KdsOrderCardProps = {
  orderNumberLabel: string;
  typeLabel: string;
  /** Table label or customer name. */
  subtitle?: string | null;
  ageLabel: string;
  ageLevel: AgeLevel;
  ageAriaLabel?: string;
  note?: string | null;
  items: KdsOrderCardItem[];
  addedLabel: string;
  voidedLabel: string;
  /** Primary action, e.g. "Start" / "Ready". Omit to show `statusNote` instead. */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  /** Shown when there is no action, e.g. "Awaiting payment". */
  statusNote?: string | null;
  /** Dims the card while a request is in flight. */
  pending?: boolean;
  className?: string;
};

export function KdsOrderCard({
  orderNumberLabel,
  typeLabel,
  subtitle,
  ageLabel,
  ageLevel,
  ageAriaLabel,
  note,
  items,
  addedLabel,
  voidedLabel,
  actionLabel,
  onAction,
  actionDisabled,
  statusNote,
  pending,
  className,
}: KdsOrderCardProps) {
  return (
    <article
      aria-busy={pending || undefined}
      className={cn(
        'bg-card text-card-foreground relative flex shrink-0 flex-col overflow-hidden rounded-3xl border shadow-sm transition-opacity',
        pending && 'opacity-60',
        className,
      )}
    >
      <header className="relative flex items-start justify-between gap-2 border-b py-3 ps-7 pe-4">
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-3 start-3 w-1.5 rounded-full',
            ageLevel === 'red' && 'bg-destructive',
            ageLevel === 'amber' && 'bg-warning',
            ageLevel === 'normal' && 'bg-border',
          )}
        />
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight tabular-nums">{orderNumberLabel}</p>
          <p className="text-muted-foreground truncate text-sm">
            {typeLabel}
            {subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
        <AgeTimer label={ageLabel} level={ageLevel} ariaLabel={ageAriaLabel} />
      </header>

      <ul className="flex flex-col divide-y">
        {items.map((item) => {
          const body = (
            <>
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  item.isReady && 'bg-success text-success-foreground border-success',
                )}
                aria-hidden
              >
                {item.isReady ? <CheckIcon className="size-4" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'flex flex-wrap items-center gap-2 text-base font-medium',
                    item.isVoided && 'text-muted-foreground line-through',
                    item.isReady && !item.isVoided && 'text-muted-foreground',
                  )}
                >
                  <span className="tabular-nums">{item.quantity}×</span>
                  <span>{item.name}</span>
                  {item.isAddition ? <Badge variant="info">{addedLabel}</Badge> : null}
                  {item.isVoided ? <Badge variant="destructive">{voidedLabel}</Badge> : null}
                </span>
                {item.modifiers.length > 0 ? (
                  <span className="text-muted-foreground block text-sm">
                    {item.modifiers.join(' · ')}
                  </span>
                ) : null}
                {item.note ? <span className="block text-sm italic">{item.note}</span> : null}
                {item.isVoided && item.voidReason ? (
                  <span className="text-destructive block text-sm">{item.voidReason}</span>
                ) : null}
              </span>
            </>
          );
          return (
            <li key={item.id}>
              {item.onToggle ? (
                <button
                  type="button"
                  aria-pressed={item.isReady}
                  onClick={item.onToggle}
                  className="hover:bg-accent/40 focus-visible:ring-ring flex min-h-12 w-full items-start gap-3 py-2.5 ps-7 pe-4 text-start focus-visible:outline-none focus-visible:ring-2"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-h-12 items-start gap-3 py-2.5 ps-7 pe-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {note ? (
        <p className="bg-highlight text-highlight-foreground border-t py-2 ps-7 pe-4 text-sm font-medium">
          {note}
        </p>
      ) : null}

      <footer className="mt-auto border-t p-3">
        {actionLabel && onAction ? (
          <Button
            type="button"
            size="touch"
            className="w-full"
            onClick={onAction}
            disabled={actionDisabled}
          >
            {actionLabel}
          </Button>
        ) : statusNote ? (
          <p className="text-muted-foreground py-2 text-center text-sm font-medium">{statusNote}</p>
        ) : null}
      </footer>
    </article>
  );
}
