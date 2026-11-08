import { useCallback, useState } from 'react';

/**
 * Previous/next paging over an API that hands out an opaque `nextCursor`. The stack holds the
 * cursor of every page already visited, so "previous" is free and filter changes restart at page 1.
 */
export function useCursorPages() {
  const [stack, setStack] = useState<string[]>([]);
  const cursor = stack[stack.length - 1];
  return {
    cursor,
    pageNumber: stack.length + 1,
    hasPrevious: stack.length > 0,
    next: useCallback((nextCursor: string) => {
      setStack((s) => [...s, nextCursor]);
    }, []),
    previous: useCallback(() => {
      setStack((s) => s.slice(0, -1));
    }, []),
    reset: useCallback(() => {
      setStack([]);
    }, []),
  };
}
