import { toast } from '@app/ui';
import type { TFunction } from 'i18next';

import { showApiError } from '../../lib/show-api-error.js';
import { messageFromMutationError } from './menu-api-errors.js';

export function showMenuApiError(error: unknown, t: TFunction): void {
  toast.error(messageFromMutationError(error, t));
}

export { showApiError };
