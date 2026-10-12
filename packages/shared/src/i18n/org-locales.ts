import { z } from 'zod';

export const ORG_LOCALE_CODES = ['ar', 'en'] as const;
export type OrgLocaleCode = (typeof ORG_LOCALE_CODES)[number];

export const orgLocaleCodeSchema = z.enum(ORG_LOCALE_CODES);

export function parseOrgLocalesInput(locales: OrgLocaleCode[]): OrgLocaleCode[] {
  const unique = [...new Set(locales)];
  if (unique.length !== locales.length) {
    throw new Error('Duplicate locales');
  }
  if (unique.length === 0) {
    throw new Error('Locales must not be empty');
  }
  return unique;
}
