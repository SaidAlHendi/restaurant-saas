import { z } from 'zod';

export type OrgLocaleContext = {
  defaultLocale: string;
  locales: string[];
};

/** Raw jsonb map in request bodies; refined in the API with org locale rules. */
export const localizedTextInputSchema = z.record(z.string(), z.string());

export const moneyMinorSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

export type LocalizedText = Record<string, string>;

export class LocalizedTextValidationError extends Error {
  constructor(
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'LocalizedTextValidationError';
  }
}

export function assertNoDuplicateIds(ids: string[], field = 'orderedIds'): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new LocalizedTextValidationError(`Duplicate id in ${field}`, {
        field,
        id,
      });
    }
    seen.add(id);
  }
}

/**
 * Validates translatable fields: default locale required and non-empty;
 * only keys listed in org.locales; unknown keys rejected.
 */
export function parseLocalizedText(
  value: LocalizedText,
  org: OrgLocaleContext,
  options: { optional?: boolean } = {},
): LocalizedText {
  const localeSet = new Set(org.locales);
  for (const key of Object.keys(value)) {
    if (!localeSet.has(key)) {
      throw new LocalizedTextValidationError('Locale is not enabled for this organization', {
        locale: key,
        allowedLocales: org.locales,
      });
    }
  }

  const defaultVal = value[org.defaultLocale];
  if (!options.optional) {
    if (defaultVal === undefined || defaultVal.trim().length === 0) {
      throw new LocalizedTextValidationError('Default locale text is required', {
        defaultLocale: org.defaultLocale,
      });
    }
  }

  const out: LocalizedText = {};
  for (const locale of org.locales) {
    if (Object.prototype.hasOwnProperty.call(value, locale)) {
      out[locale] = value[locale] ?? '';
    }
  }
  return out;
}

export function parseOptionalLocalizedText(
  value: LocalizedText | undefined | null,
  org: OrgLocaleContext,
): LocalizedText | null {
  if (value === undefined || value === null) {
    return null;
  }
  return parseLocalizedText(value, org, { optional: true });
}
