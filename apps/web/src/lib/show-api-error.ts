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
  if (parsed.message && parsed.message.length > 0) {
    return parsed.message;
  }
  return t('common.errors.generic');
}

export function showApiError(error: unknown, t: TFunction): void {
  toast.error(messageFromApiError(error, t));
}
