import { useCallback } from 'react';

import { useControllableState } from './use-controllable-state.js';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra words that should match the search (e.g. the name in the other language). */
  keywords?: string[];
  disabled?: boolean;
}

export interface UseComboboxOptions {
  options: ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useCombobox({
  options,
  value,
  defaultValue = null,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
}: UseComboboxOptions) {
  const [currentValue, setValue] = useControllableState<string | null>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const selected = options.find((option) => option.value === currentValue) ?? null;

  const select = useCallback(
    (next: string) => {
      setValue(next);
      setOpen(false);
    },
    [setValue, setOpen],
  );

  return { open: isOpen, setOpen, value: currentValue, selected, select };
}
