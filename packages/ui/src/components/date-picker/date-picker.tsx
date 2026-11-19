import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { ar, enUS } from 'react-day-picker/locale';

import { cn } from '../../lib/cn.js';
import { useDirection } from '../../lib/direction.js';
import { Button } from '../button/index.js';
import { Calendar } from '../calendar/index.js';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/index.js';

/** Parse a `YYYY-MM-DD` string as a local date, or undefined when invalid. */
function parseIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DatePickerProps = {
  /** Selected date as `YYYY-MM-DD`; empty string means none. */
  value: string;
  onChange: (value: string) => void;
  /** Text shown when nothing is selected. */
  placeholder?: string;
  /** UI language, e.g. `ar` or `en`; picks calendar month/day names. */
  locale?: string;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder,
  locale = 'en',
  id,
  'aria-label': ariaLabel,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const dir = useDirection();
  const selected = parseIsoDate(value);
  const lang = locale.startsWith('ar') ? 'ar' : 'en';
  const label = selected
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
        dateStyle: 'medium',
      }).format(selected)
    : (placeholder ?? '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          data-empty={selected ? undefined : 'true'}
          className={cn(
            'h-9 w-full justify-start gap-2 text-start font-normal data-[empty=true]:text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" aria-hidden />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          dir={dir}
          locale={lang === 'ar' ? ar : enUS}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toIsoDate(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
