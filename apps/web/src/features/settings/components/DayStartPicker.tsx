import { CheckIcon, ClockIcon } from 'lucide-react';

import { cn, Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@app/ui';

export type DayStartPickerProps = {
  id: string;
  /** Selected hour as a string, '0'..'23'. */
  value: string;
  onChange: (value: string) => void;
  locale: string;
  groups: { label: string; hours: number[] }[];
};

function formatHour(hour: number, locale: string): string {
  const d = new Date(2000, 0, 1, hour, 0, 0);
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** Friendly time picker for the business-day start, grouped by part of the day. */
export function DayStartPicker({ id, value, onChange, locale, groups }: DayStartPickerProps) {
  const selected = Number(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="border-input bg-background hover:bg-muted/50 focus-visible:ring-ring flex h-11 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none sm:w-56"
        >
          <span className="flex items-center gap-2">
            <ClockIcon className="text-muted-foreground size-4" aria-hidden />
            <span className="font-medium tabular-nums">{formatHour(selected, locale)}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">{group.label}</p>
            <div className="grid grid-cols-3 gap-2">
              {group.hours.map((hour) => {
                const active = hour === selected;
                return (
                  <PopoverClose asChild key={hour}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onChange(String(hour));
                      }}
                      className={cn(
                        'flex h-9 items-center justify-center gap-1 rounded-md border text-sm tabular-nums transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input hover:bg-muted',
                      )}
                    >
                      {active ? <CheckIcon className="size-3.5" aria-hidden /> : null}
                      {formatHour(hour, locale)}
                    </button>
                  </PopoverClose>
                );
              })}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
