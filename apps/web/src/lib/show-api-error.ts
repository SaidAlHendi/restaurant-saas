import { toast } from '@app/ui';
import type { TFunction } from 'i18next';

import { parseApiError } from './api-error-message.js';

export function messageFromApiError(error: unknown, t: TFunction): string {
  const parsed = parseApiError(error);
  switch (parsed.code) {
    case 'VALIDATION_ERROR':
      return t('common.errors.validation');
    case 'NOT_FOUND':
      return t('common.errors.notFound');
    case 'LAST_OWNER':
      return t('common.errors.lastOwner');
    case 'FORBIDDEN':
      return t('common.errors.forbidden');
    case 'STAFF_ALREADY_MEMBER':
      return t('common.errors.staffAlreadyMember');
    case 'MEMBERSHIP_NOT_ACTIVE_OR_DISABLED':
      return t('common.errors.membershipNotActiveOrDisabled');
    case 'FILE_TOO_LARGE':
      return t('common.errors.fileTooLarge');
    case 'UNSUPPORTED_IMAGE_TYPE':
      return t('common.errors.unsupportedImageType');
    default:
      return t('common.errors.generic');
  }
}

export function showApiError(error: unknown, t: TFunction): void {
  toast.error(messageFromApiError(error, t));
}
