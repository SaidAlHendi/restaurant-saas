import type { TFunction } from 'i18next';

import { parseApiError } from '../../lib/api-error-message.js';
import { planGateFromError, planLimitMessageKey } from '../billing/plan-gate.utils.js';

const KNOWN_CODES = [
  'CATEGORY_HAS_ACTIVE_PRODUCTS',
  'FILE_TOO_LARGE',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'UNSUPPORTED_IMAGE_TYPE',
] as const;

export type MenuApiErrorCode = (typeof KNOWN_CODES)[number] | 'UNKNOWN';

export function parseMenuApiErrorCode(error: unknown): MenuApiErrorCode {
  const parsed = parseApiError(error);
  if (parsed.code === null) {
    return 'UNKNOWN';
  }
  if ((KNOWN_CODES as readonly string[]).includes(parsed.code)) {
    return parsed.code as MenuApiErrorCode;
  }
  return 'UNKNOWN';
}

/** i18n key lookup (use `(key) => t(key)` from react-i18next in app code). */
export type MenuErrorTranslator = (key: string) => string;

export function menuApiErrorMessage(t: MenuErrorTranslator, code: MenuApiErrorCode): string {
  switch (code) {
    case 'CATEGORY_HAS_ACTIVE_PRODUCTS':
      return t('menu.errors.categoryHasActiveProducts');
    case 'FILE_TOO_LARGE':
      return t('menu.errors.fileTooLarge');
    case 'UNSUPPORTED_IMAGE_TYPE':
      return t('menu.errors.unsupportedImageType');
    case 'VALIDATION_ERROR':
      return t('menu.errors.validation');
    case 'NOT_FOUND':
      return t('menu.errors.notFound');
    default:
      return t('menu.errors.generic');
  }
}

export function messageFromMutationError(error: unknown, t: TFunction): string {
  const gate = planGateFromError(error);
  if (gate?.kind === 'limit') {
    return t(planLimitMessageKey(gate.limit), { max: gate.max ?? '' });
  }
  if (gate?.kind === 'feature') {
    return t('billing.upgrade.featureToast');
  }
  return menuApiErrorMessage((key) => t(key), parseMenuApiErrorCode(error));
}
