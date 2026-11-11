import { useCallback, useEffect, useState } from 'react';

import { consentCookie, parseConsent, type ConsentChoice } from '../consent.utils.js';
import { loadTags } from '../tags.client.js';
import type { TrackingIds } from '../tracking.js';

/**
 * Cookie consent. Until the visitor accepts, no analytics or ad script is loaded. The banner is
 * only shown once the stored choice has been read in the browser, so server and client markup agree.
 */
export function useConsent(tracking: TrackingIds) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(parseConsent(document.cookie));
    setReady(true);
  }, []);

  useEffect(() => {
    if (choice === 'accepted') {
      loadTags(tracking);
    }
  }, [choice, tracking]);

  const decide = useCallback((next: ConsentChoice) => {
    document.cookie = consentCookie(next, window.location.protocol === 'https:');
    setChoice(next);
  }, []);

  const accept = useCallback(() => {
    decide('accepted');
  }, [decide]);
  const reject = useCallback(() => {
    decide('rejected');
  }, [decide]);

  return { choice, showBanner: ready && choice === null, accept, reject };
}
