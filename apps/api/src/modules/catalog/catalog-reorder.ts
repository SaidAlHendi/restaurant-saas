import { NotFoundError, ValidationError } from '../../core/errors/app-errors';
import { assertNoDuplicateIds, LocalizedTextValidationError } from '@app/shared';

export function validateReorderIds(orderedIds: string[], activeIds: string[]): void {
  try {
    assertNoDuplicateIds(orderedIds);
  } catch (err: unknown) {
    if (err instanceof LocalizedTextValidationError) {
      throw new ValidationError(err.message, err.details);
    }
    throw err;
  }

  const activeSet = new Set(activeIds);
  for (const id of orderedIds) {
    if (!activeSet.has(id)) {
      throw new NotFoundError();
    }
  }

  if (orderedIds.length !== activeIds.length) {
    throw new ValidationError('Reorder list must include every item', {}, 'REORDER_INCOMPLETE_LIST');
  }
}
