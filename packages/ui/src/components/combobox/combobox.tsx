import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { useCombobox, type UseComboboxOptions } from '../../hooks/use-combobox.js';
import { cn } from '../../lib/cn.js';
import { fieldInvalid } from '../../lib/styles.js';
import { buttonVariants } from '../button/button-variants.js';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../command/command.js';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover.js';

export interface ComboboxProps extends UseComboboxOptions {
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** Searchable select. Text comes from props (already translated). */
export function Combobox({
  placeholder,
  searchPlaceholder,
  emptyText,
  id,
  disabled,
  className,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  ...options
}: ComboboxProps) {
  const { open, setOpen, value, selected, select } = useCombobox(options);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        data-slot="combobox-trigger"
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'w-full justify-between px-3 font-normal',
          !selected && 'text-muted-foreground',
          fieldInvalid,
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDownIcon className="opacity-50" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-48 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  disabled={option.disabled}
                  onSelect={select}
                >
                  <CheckIcon
                    className={cn('text-foreground', value === option.value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
