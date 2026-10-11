import { useEffect } from 'react';

/** Keeps a wall tablet's screen on; silently does nothing where unsupported. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') {
      return undefined;
    }
    // Older Safari / non-secure origins (http on the LAN) have no Wake Lock API.
    if (!('wakeLock' in navigator)) {
      return undefined;
    }
    const wakeLock = navigator.wakeLock;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      wakeLock
        .request('screen')
        .then((s) => {
          if (cancelled) {
            void s.release().catch(() => undefined);
          } else {
            sentinel = s;
          }
        })
        .catch(() => undefined);
    };

    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}
