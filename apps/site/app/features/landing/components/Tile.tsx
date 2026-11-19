import { cn } from '@app/ui';
import type { ReactNode } from 'react';

export type TileTone = 'paper' | 'accent' | 'brand' | 'highlight' | 'ink' | 'warning';

const TONE_CLASSES: Record<TileTone, string> = {
  paper: 'bg-background text-foreground',
  accent: 'bg-accent text-accent-foreground',
  brand: 'bg-primary text-primary-foreground',
  highlight: 'bg-highlight text-foreground',
  ink: 'bg-foreground text-background',
  warning: 'bg-warning text-warning-foreground',
};

export type TileProps = {
  as?: 'div' | 'section' | 'article';
  tone: TileTone;
  id?: string;
  /** Grid placement and height, e.g. `md:col-span-7 md:min-h-[560px]`. */
  className?: string;
  children: ReactNode;
};

/** One tile of the ticket-rail board. Mobile is a single column; tablet and up use a 12-column grid. */
export function Tile({ as: Tag = 'div', tone, id, className, children }: TileProps) {
  return (
    <Tag
      id={id}
      className={cn(
        'relative col-span-12 flex flex-col justify-between gap-4 overflow-hidden rounded-[10px] p-5 md:p-8',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
