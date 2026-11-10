import { useEffect, useRef } from 'react';

import { trackLead } from '../tags.client.js';
import type { TrackingIds } from '../tracking.js';
import type { ConsentChoice } from '../consent.utils.js';

/** Fires the lead conversion once, on the thank-you page, and only for visitors who accepted. */
export function useLeadConversion(tracking: TrackingIds, choice: ConsentChoice | null) {
  const fired = useRef(false);
  useEffect(() => {
    if (choice === 'accepted' && !fired.current) {
      fired.current = true;
      trackLead(tracking);
    }
  }, [choice, tracking]);
}
