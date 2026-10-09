import { useEffect, useRef } from 'react';

import type { FieldValues, UseFormReturn } from 'react-hook-form';

/** Reset react-hook-form only when a dialog/sheet opens or the edited entity id changes. */
export function useMenuFormResetOnOpenOrEntity<T extends FieldValues, TOutput extends FieldValues>(
  form: UseFormReturn<T, unknown, TOutput>,
  open: boolean,
  entityKey: string,
  valuesForReset: () => T,
) {
  const wasOpenRef = useRef(false);
  const lastEntityKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const justOpened = !wasOpenRef.current;
    const entityChanged = entityKey !== lastEntityKeyRef.current;
    if (justOpened || entityChanged) {
      form.reset(valuesForReset());
    }
    wasOpenRef.current = true;
    lastEntityKeyRef.current = entityKey;
  }, [entityKey, form, open, valuesForReset]);
}
