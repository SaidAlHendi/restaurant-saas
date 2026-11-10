import { useEffect } from 'react';

import { ATTRIBUTION_STORAGE_KEY, parseAttribution } from '../../../lib/attribution.js';

/**
 * Remember where the visitor came from (utm_*, gclid, fbclid, referrer) for the first visit of the
 * session, so the lead form can save it with the lead. sessionStorage only: nothing is sent anywhere.
 */
export function useAttributionCapture() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) !== null) {
        return;
      }
      const attribution = parseAttribution(
        window.location.search,
        document.referrer,
        window.location.pathname,
      );
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    } catch {
      // Storage can be blocked (private mode, strict settings). Attribution is optional.
    }
  }, []);
}
