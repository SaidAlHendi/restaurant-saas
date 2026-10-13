import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { orderDetailSchema, type OrderDetail } from '@app/shared';
import type { TFunction } from 'i18next';

const KNOWN_CODES = [
  'ORDER_VERSION_CONFLICT',
  'ORDER_INVALID_TRANSITION',
  'ORDER_NOT_EDITABLE',
  'ORDER_HAS_PAYMENTS',
  'ORDER_NOT_PAID',
  'ITEM_VOIDED',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'FORBIDDEN',
  'PAYMENT_METHOD_NOT_ACCEPTED',
  'MANAGER_APPROVAL_REQUIRED',
  'PIN_INVALID',
  'PIN_LOCKED',
] as const;

export type OrdersApiErrorCode = (typeof KNOWN_CODES)[number] | 'UNKNOWN';

export function parseOrdersApiErrorCode(error: unknown): OrdersApiErrorCode {
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
    return code as OrdersApiErrorCode;
  }
  return 'UNKNOWN';
}

export function orderFromVersionConflict(error: unknown): OrderDetail | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const fetchError = error as FetchBaseQueryError;
  if (!('status' in fetchError) || fetchError.status !== 409) {
    return undefined;
  }
  const data = fetchError.data;
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const nested = data as { error?: { details?: { order?: unknown } } };
  const raw = nested.error?.details?.order;
  if (raw === undefined) {
    return undefined;
  }
  const parsed = orderDetailSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export type OrdersErrorTranslator = (key: string) => string;

export function ordersApiErrorMessage(t: OrdersErrorTranslator, code: OrdersApiErrorCode): string {
  switch (code) {
    case 'ORDER_VERSION_CONFLICT':
      return t('orders.errors.versionConflict');
    case 'ORDER_INVALID_TRANSITION':
      return t('orders.errors.invalidTransition');
    case 'ORDER_NOT_EDITABLE':
      return t('orders.errors.notEditable');
    case 'ORDER_HAS_PAYMENTS':
      return t('orders.errors.hasPayments');
    case 'ORDER_NOT_PAID':
      return t('orders.errors.notPaid');
    case 'ITEM_VOIDED':
      return t('orders.errors.itemVoided');
    case 'VALIDATION_ERROR':
      return t('orders.errors.validation');
    case 'NOT_FOUND':
      return t('orders.errors.notFound');
    case 'FORBIDDEN':
      return t('orders.errors.forbidden');
    case 'PAYMENT_METHOD_NOT_ACCEPTED':
      return t('orders.errors.paymentMethodNotAccepted');
    case 'MANAGER_APPROVAL_REQUIRED':
      return t('orders.errors.managerApprovalRequired');
    case 'PIN_INVALID':
      return t('orders.errors.pinInvalid');
    case 'PIN_LOCKED':
      return t('orders.errors.pinLocked');
    default:
      return t('orders.errors.generic');
  }
}

export function messageFromOrdersMutationError(error: unknown, t: TFunction): string {
  return ordersApiErrorMessage((key) => t(key), parseOrdersApiErrorCode(error));
}

export function isOrderNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const fetchError = error as FetchBaseQueryError;
  if (!('status' in fetchError)) {
    return false;
  }
  return fetchError.status === 404;
}
