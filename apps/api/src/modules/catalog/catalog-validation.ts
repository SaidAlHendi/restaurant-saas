import {
  LocalizedTextValidationError,
  parseLocalizedText,
  parseOptionalLocalizedText,
  type LocalizedText,
  type OrgLocaleContext,
} from '@app/shared';

import { ValidationError } from '../../core/errors/app-errors';

export function requireLocalizedText(
  value: LocalizedText,
  org: OrgLocaleContext,
): LocalizedText {
  try {
    return parseLocalizedText(value, org);
  } catch (err: unknown) {
    if (err instanceof LocalizedTextValidationError) {
      throw new ValidationError(err.message, err.details);
    }
    throw err;
  }
}

export function optionalLocalizedText(
  value: LocalizedText | undefined,
  org: OrgLocaleContext,
): LocalizedText | undefined {
  if (value === undefined) {
    return undefined;
  }
  try {
    return parseOptionalLocalizedText(value, org) ?? undefined;
  } catch (err: unknown) {
    if (err instanceof LocalizedTextValidationError) {
      throw new ValidationError(err.message, err.details);
    }
    throw err;
  }
}
