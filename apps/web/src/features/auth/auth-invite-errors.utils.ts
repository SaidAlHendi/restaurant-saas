import type { TFunction } from 'i18next';

import { parseApiError } from '../../lib/api-error-message.js';

export function acceptInviteErrorMessage(error: unknown, t: TFunction): string {
  const parsed = parseApiError(error);
  if (parsed.status === 410 || parsed.code === 'INVITE_EXPIRED') {
    return t('auth.invite.expired');
  }
  if (parsed.status === 401 || parsed.code === 'INVALID_CREDENTIALS') {
    return t('auth.invite.wrongPassword');
  }
  return t('auth.invite.error');
}

export function isInviteExpiredError(error: unknown): boolean {
  const parsed = parseApiError(error);
  return parsed.status === 410 || parsed.code === 'INVITE_EXPIRED';
}
