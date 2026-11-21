import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/** Blocks in-app navigation and tab close/reload while `dirty` is true. Needs a data router. */
export function useUnsavedChangesGuard(dirty: boolean) {
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);

  return blocker;
}
