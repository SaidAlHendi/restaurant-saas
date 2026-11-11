import { useEffect, useRef } from 'react';

import { trackLead } from '../tags.client.js';
import type { TrackingIds } from '../tracking.js';
import type { ConsentChoice } from '../consent.utils.js';

/** Fires the lead conversion once, on the thank-you page, for visitors who accepted and just submitted the form. */
export function useLeadConversion(
  tracking: TrackingIds,
  choice: ConsentChoice | null,
  leadSubmitted: boolean,
) {
  const fired = useRef(false);
  useEffect(() => {
    if (leadSubmitted && choice === 'accepted' && !fired.current) {
      fired.current = true;
      trackLead(tracking);
    }
  }, [choice, tracking, leadSubmitted]);
}
