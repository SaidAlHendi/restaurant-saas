import { useRef, type ComponentProps } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';

import { useSearchInput, type UseSearchInputOptions } from '../../hooks/use-search-input.js';
import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';
import { Input } from '../input/input.js';

export interface SearchInputProps
  extends
    UseSearchInputOptions,
    Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type'> {
  /** Accessible label for the clear button (already translated). */
  clearLabel: string;
}

/** Search box that reports its text after typing pauses (debounced). Esc clears it. */
export function SearchInput({
  defaultValue,
  onValueChange,
  delay,
  clearLabel,
  className,
  ...props
}: SearchInputProps) {
  const { hasText, clear, inputProps } = useSearchInput({ defaultValue, onValueChange, delay });
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div data-slot="search-input" className={cn('relative w-full', className)}>
      <SearchIcon
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        autoComplete="off"
        className="ps-9 pe-9 [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
        {...inputProps}
      />
      {hasText ? (
        <button
          type="button"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={() => {
            clear();
            inputRef.current?.focus();
          }}
          className={cn(
            'absolute end-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground',
            focusRing,
          )}
        >
          <XIcon className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
