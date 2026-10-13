import { patchOrgSettingsBodySchema, type OrgLocaleCode } from '@app/shared';

export type OrgLocalesFormValues = {
  locales: OrgLocaleCode[];
  defaultLocale: OrgLocaleCode;
};

export type OrgLocalesFormValidation =
  | { ok: true; patch: { locales: OrgLocaleCode[]; defaultLocale: OrgLocaleCode } }
  | { ok: false; field: 'locales' | 'defaultLocale' | 'form'; messageKey: string };

export function validateOrgLocalesForm(values: OrgLocalesFormValues): OrgLocalesFormValidation {
  const parsed = patchOrgSettingsBodySchema.safeParse({
    locales: values.locales,
    defaultLocale: values.defaultLocale,
  });
  if (parsed.success) {
    return {
      ok: true,
      patch: {
        locales: parsed.data.locales ?? values.locales,
        defaultLocale: parsed.data.defaultLocale ?? values.defaultLocale,
      },
    };
  }
  const issue = parsed.error.issues[0];
  const path = issue?.path[0];
  if (path === 'locales') {
    return { ok: false, field: 'locales', messageKey: 'settings.restaurant.localesInvalid' };
  }
  if (path === 'defaultLocale') {
    return { ok: false, field: 'defaultLocale', messageKey: 'settings.restaurant.defaultLocaleInvalid' };
  }
  return { ok: false, field: 'form', messageKey: 'settings.restaurant.localesInvalid' };
}
