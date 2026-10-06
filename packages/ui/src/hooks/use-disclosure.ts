import { useCallback } from 'react';

import { useControllableState } from './use-controllable-state.js';

export interface UseDisclosureOptions {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Open/closed state for sidebars, panels and sections; controlled or uncontrolled. */
export function useDisclosure({
  open,
  defaultOpen = false,
  onOpenChange,
}: UseDisclosureOptions = {}) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const toggle = useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);
  const onOpen = useCallback(() => {
    setOpen(true);
  }, [setOpen]);
  const onClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);
  return { open: isOpen, setOpen, toggle, onOpen, onClose };
}
