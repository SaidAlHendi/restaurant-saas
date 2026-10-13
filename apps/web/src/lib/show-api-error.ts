import { toast } from '@app/ui';
import type { TFunction } from 'i18next';

import { parseApiError } from './api-error-message.js';

export function messageFromApiError(error: unknown, t: TFunction): string {
  const parsed = parseApiError(error);
  if (parsed.code === 'VALIDATION_ERROR') {
    return t('common.errors.validation');
  }
  if (parsed.code === 'NOT_FOUND') {
    return t('common.errors.notFound');
  }
  if (parsed.code === 'LAST_OWNER') {
    return t('common.errors.lastOwner');
  }
  if (parsed.code === 'FORBIDDEN') {
    return t('common.errors.forbidden');
  }
  if (parsed.code === 'STAFF_ALREADY_MEMBER') {
    return t('common.errors.staffAlreadyMember');
  }
  return t('common.errors.generic');
}

export function showApiError(error: unknown, t: TFunction): void {
  toast.error(messageFromApiError(error, t));
}
