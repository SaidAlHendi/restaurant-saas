import { toast } from '@app/ui';
import type { TFunction } from 'i18next';

import { messageFromOrdersMutationError } from './orders-api-errors.js';

export function showOrdersApiError(error: unknown, t: TFunction): void {
  toast.error(messageFromOrdersMutationError(error, t));
}
