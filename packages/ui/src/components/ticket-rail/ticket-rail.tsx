import type { CSSProperties } from 'react';

import { cn } from '../../lib/cn.js';

export interface Ticket {
  /** Big line on the ticket, e.g. "Table 4". */
  title: string;
  /** Small line next to the title, e.g. a time. */
  meta?: string;
  /** One order line per entry. */
  lines: readonly string[];
  /** Short status word shown at the bottom, e.g. "Ready". */
  status?: string;
}

export interface TicketRailProps {
  tickets: readonly Ticket[];
  /** Scroll direction of the rail; two rails side by side look best when they differ. */
  direction?: 'up' | 'down';
  className?: string;
}

const ZIGZAG =
  'polygon(0 0,100% 0,100% calc(100% - 8px),95% 100%,90% calc(100% - 8px),85% 100%,80% calc(100% - 8px),75% 100%,70% calc(100% - 8px),65% 100%,60% calc(100% - 8px),55% 100%,50% calc(100% - 8px),45% 100%,40% calc(100% - 8px),35% 100%,30% calc(100% - 8px),25% 100%,20% calc(100% - 8px),15% 100%,10% calc(100% - 8px),5% 100%,0 calc(100% - 8px))';

/** A kitchen ticket: paper slip with a torn bottom edge. Colors come from `--ticket-paper` / `--ticket-ink`. */
export function TicketSlip({
  ticket,
  className,
  style,
}: {
  ticket: Ticket;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'bg-(--ticket-paper,var(--card)) px-4 pb-5 pt-4 text-(--ticket-ink,var(--card-foreground))',
        className,
      )}
      style={{ ...style, clipPath: ZIGZAG }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-bold leading-tight">{ticket.title}</p>
        {ticket.meta ? <p className="text-sm tabular-nums opacity-70">{ticket.meta}</p> : null}
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        {ticket.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {ticket.status ? (
        <p className="mt-3 inline-block bg-(--ticket-ink,var(--card-foreground)) px-2 py-0.5 text-xs text-(--ticket-paper,var(--card))">
          {ticket.status}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A column of slips that slowly rolls past, like a kitchen rail at service time.
 * The list is rendered twice so the loop is seamless; the copy is hidden from assistive tech.
 * Motion stops for people who prefer reduced motion.
 */
export function TicketRail({ tickets, direction = 'up', className }: TicketRailProps) {
  const track = (hidden: boolean) => (
    <div className="flex flex-col gap-4 pb-4" aria-hidden={hidden || undefined}>
      {tickets.map((ticket, i) => (
        <TicketSlip
          key={`${ticket.title}-${String(i)}`}
          ticket={ticket}
          className={i % 2 === 0 ? 'rotate-[-1.5deg]' : 'rotate-[1.2deg]'}
        />
      ))}
    </div>
  );
  return (
    <div className={cn('overflow-hidden', className)}>
      <div
        className={cn(
          'flex flex-col motion-safe:animate-[ticket-rail_90s_linear_infinite]',
          direction === 'down' && 'motion-safe:[animation-direction:reverse]',
        )}
      >
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
