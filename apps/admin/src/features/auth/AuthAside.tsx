import './auth-fonts.css';

import { useTranslation } from 'react-i18next';

import { TicketRail, TicketSlip, type Ticket } from '@app/ui';

const FIELD = '#2a1710';
const INK = '#2a1710';
const WORDMARK = '#38211a';
const LIVE_BG = '#bb4e27';

interface LiveTexts {
  default: string;
  meta: string;
  status: string;
  lines: string[];
}

/** Rotates a list so each rail starts at a different ticket. */
function rotate<T>(list: readonly T[], by: number): T[] {
  const n = by % list.length;
  return [...list.slice(n), ...list.slice(0, n)];
}

/**
 * Full-page backdrop behind the sign-in panel: a flat colour field, the wordmark cropped along the
 * bottom and columns of kitchen tickets rolling past in opposite directions.
 */
export function AuthAside() {
  const { t } = useTranslation();
  const tickets = t('auth.aside.tickets', { returnObjects: true }) as Ticket[];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: FIELD,
        fontFamily: "'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
        ['--ticket-paper' as string]: '#ffffff',
        ['--ticket-ink' as string]: INK,
      }}
    >
      <span
        className="auth-display absolute inset-x-0 bottom-0 select-none text-center leading-[0.9]"
        style={{ color: WORDMARK, fontSize: 'clamp(160px, 30vw, 520px)', marginBottom: '-0.14em' }}
      >
        صحتين
      </span>
      <div className="absolute inset-0 grid grid-cols-2 gap-5 px-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <TicketRail
            key={i}
            tickets={rotate(tickets, i * 2)}
            direction={i % 2 === 0 ? 'up' : 'down'}
            className={[
              'h-full opacity-30',
              i === 2 ? 'hidden md:block' : '',
              i === 1 ? 'mt-24' : '',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

/** The slip that peeks out of the top of the form panel; on sign-up it carries the restaurant name. */
export function AuthLiveTicket({ liveName }: { liveName?: string }) {
  const { t } = useTranslation();
  const live = t('auth.aside.live', { returnObjects: true }) as LiveTexts;
  const ticket: Ticket = {
    title: liveName?.trim() ? liveName.trim() : live.default,
    meta: live.meta,
    lines: live.lines,
    status: live.status,
  };
  return (
    <TicketSlip
      ticket={ticket}
      className="rotate-[-2deg]"
      style={{ ['--ticket-paper' as string]: LIVE_BG, ['--ticket-ink' as string]: '#ffffff' }}
    />
  );
}
