import { useEffect } from 'react';

/** Swaps the page manifest to the KDS one while the kitchen screen is open (install -> /kds). */
export function useKdsDocument(): void {
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
    link.href = '/kds.webmanifest';

    return () => {
      if (previousHref !== null && previousHref.length > 0) {
        link.href = previousHref;
      } else if (existing === null) {
        link.remove();
      }
    };
  }, []);
}
