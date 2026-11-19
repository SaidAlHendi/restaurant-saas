import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useContactForm } from './use-contact-form.js';
import { useInnerPage } from './use-inner-page.js';

/** The contact page: the shared page content plus the lead form state. */
export function useContactPage(locale: LandingLocale, tracking: TrackingIds) {
  return { ...useInnerPage(locale, tracking, 'contact'), form: useContactForm() };
}
