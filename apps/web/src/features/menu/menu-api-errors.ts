import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { TFunction } from 'i18next';

const KNOWN_CODES = [
  'CATEGORY_HAS_ACTIVE_PRODUCTS',
  'FILE_TOO_LARGE',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'UNSUPPORTED_IMAGE_TYPE',
] as const;

export type MenuApiErrorCode = (typeof KNOWN_CODES)[number] | 'UNKNOWN';

export function parseMenuApiErrorCode(error: unknown): MenuApiErrorCode {
  if (!error || typeof error !== 'object') {
    return 'UNKNOWN';
  }
  const fetchError = error as FetchBaseQueryError;
  if (!('status' in fetchError)) {
    return 'UNKNOWN';
  }
  const data = fetchError.data;
  if (!data || typeof data !== 'object') {
    return 'UNKNOWN';
  }
  const nested = data as { error?: { code?: unknown } };
  const code = nested.error?.code;
  if (typeof code !== 'string') {
    return 'UNKNOWN';
  }
  if ((KNOWN_CODES as readonly string[]).includes(code)) {
    return code as MenuApiErrorCode;
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
  return menuApiErrorMessage((key) => t(key), parseMenuApiErrorCode(error));
}
