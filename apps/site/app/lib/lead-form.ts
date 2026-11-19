import {
  leadAttributionSchema,
  leadCreateBodySchema,
  type LeadAttribution,
  type LeadCreateBody,
} from '@app/shared';

import type { LandingLocale } from './locale.js';

export const LEAD_FIELDS = [
  'name',
  'restaurantName',
  'phone',
  'email',
  'country',
  'branches',
  'message',
] as const;

export type LeadField = (typeof LEAD_FIELDS)[number];
export type LeadFormValues = Record<LeadField, string>;
export type LeadFieldErrors = Partial<Record<LeadField, 'required' | 'invalid'>>;

export function emptyLeadFormValues(): LeadFormValues {
  return { name: '', restaurantName: '', phone: '', email: '', country: '', branches: '1', message: '' };
}

export type ReadLeadForm = {
  values: LeadFormValues;
  /** Hidden field real visitors never fill. */
  honeypot: string;
  attribution: LeadAttribution | undefined;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/** Pull the submitted fields out of the form; anything unexpected becomes an empty string. */
export function readLeadForm(formData: FormData): ReadLeadForm {
  const values = emptyLeadFormValues();
  for (const field of LEAD_FIELDS) {
    values[field] = text(formData, field).trim();
  }
  let attribution: LeadAttribution | undefined;
  const rawAttribution = text(formData, 'attribution');
  if (rawAttribution !== '') {
    try {
      const parsed = leadAttributionSchema.safeParse(JSON.parse(rawAttribution));
      attribution = parsed.success ? parsed.data : undefined;
    } catch {
      attribution = undefined;
    }
  }
  return { values, honeypot: text(formData, 'website'), attribution };
}

export type ValidatedLead =
  | { ok: true; body: LeadCreateBody }
  | { ok: false; errors: LeadFieldErrors };

/** Validate with the same schema the API uses and map failures to one message key per field. */
export function validateLeadForm(
  { values, attribution }: ReadLeadForm,
  locale: LandingLocale,
): ValidatedLead {
  const result = leadCreateBodySchema.safeParse({
    name: values.name,
    restaurantName: values.restaurantName,
    phone: values.phone,
    email: values.email,
    country: values.country,
    branches: values.branches === '' ? Number.NaN : Number(values.branches),
    locale,
    message: values.message === '' ? undefined : values.message,
    attribution,
  });
  if (result.success) {
    return { ok: true, body: result.data };
  }
  const errors: LeadFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && (LEAD_FIELDS as readonly string[]).includes(field)) {
      const key = field as LeadField;
      errors[key] ??= values[key] === '' ? 'required' : 'invalid';
    }
  }
  return { ok: false, errors };
}
