import { useEffect } from 'react';

export function usePosDocument(): void {
  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    const link =
      existing instanceof HTMLLinkElement
        ? existing
        : (() => {
            const created = document.createElement('link');
            created.rel = 'manifest';
            document.head.appendChild(created);
            return created;
          })();
    const previousHref = link.getAttribute('href');
    link.href = '/pos.webmanifest';

    return () => {
      if (previousHref !== null && previousHref.length > 0) {
        link.href = previousHref;
      } else if (existing === null) {
        link.remove();
      }
    };
  }, []);
}
