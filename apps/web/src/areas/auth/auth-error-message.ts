import type { TFunction } from 'i18next';

import { parseApiError } from '../../lib/api-error-message.js';

/** Translated text for a failed auth request. Never shows the API's English message. */
export function authErrorMessage(error: unknown, t: TFunction): string | null {
  if (!error) return null;
  switch (parseApiError(error).code) {
    case 'INVALID_CREDENTIALS':
      return t('auth.errors.invalidCredentials');
    case 'EMAIL_TAKEN':
      return t('auth.errors.emailTaken');
    default:
      return t('auth.errors.generic');
  }
}
