import { useEffect, useState } from 'react';
import { useActionData, useNavigation } from 'react-router';

import { ATTRIBUTION_STORAGE_KEY } from '../../../lib/attribution.js';
import {
  emptyLeadFormValues,
  type LeadFieldErrors,
  type LeadFormValues,
} from '../../../lib/lead-form.js';

/** What the contact route's action returns when the form needs another look. */
export type ContactActionData = {
  values: LeadFormValues;
  errors?: LeadFieldErrors;
  formError?: 'rate_limited' | 'unavailable';
};

/** Form state: last submitted values and errors from the action, a sending flag, and the campaign data. */
export function useContactForm() {
  const actionData = useActionData<ContactActionData>();
  const navigation = useNavigation();
  const [attribution, setAttribution] = useState('');

  useEffect(() => {
    try {
      setAttribution(window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) ?? '');
    } catch {
      // Storage can be blocked; the lead is still accepted without campaign data.
    }
  }, []);

  return {
    values: actionData?.values ?? emptyLeadFormValues(),
    errors: actionData?.errors ?? {},
    formError: actionData?.formError,
    isSubmitting: navigation.state === 'submitting',
    attribution,
  };
}

export type ContactFormViewModel = ReturnType<typeof useContactForm>;
