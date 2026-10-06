import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { useDebouncedValue } from './use-debounced-value.js';

export interface UseSearchInputOptions {
  /** Starting text, e.g. from the URL. */
  defaultValue?: string;
  /** Called with the trimmed text after typing pauses for `delay` ms, and at once on clear. */
  onValueChange: (value: string) => void;
  delay?: number;
}

export function useSearchInput({
  defaultValue = '',
  onValueChange,
  delay = 300,
}: UseSearchInputOptions) {
  const [text, setText] = useState(defaultValue);
  const debounced = useDebouncedValue(text.trim(), delay);
  const lastSent = useRef(defaultValue.trim());
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    if (debounced !== lastSent.current) {
      lastSent.current = debounced;
      onValueChangeRef.current(debounced);
    }
  }, [debounced]);

  const clear = () => {
    setText('');
    if (lastSent.current !== '') {
      lastSent.current = '';
      onValueChangeRef.current('');
    }
  };

  return {
    text,
    hasText: text.length > 0,
    clear,
    inputProps: {
      value: text,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape' && text) {
          event.preventDefault();
          clear();
        }
      },
    },
  };
}
