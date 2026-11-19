import { Button, Input, Label, Textarea } from '@app/ui';
import type { ReactNode } from 'react';
import { Form } from 'react-router';

import type { LeadField } from '../../../lib/lead-form.js';
import type { LandingContent } from '../content/types.js';
import type { ContactFormViewModel } from '../hooks/use-contact-form.js';

export type ContactFormProps = {
  content: LandingContent['form'];
  form: ContactFormViewModel;
  privacyHref: string;
};

const FIELD_CLASS = 'h-11 bg-card';

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Works without JavaScript: a plain POST to the page's action, which answers with a redirect or the errors. */
export function ContactForm({ content, form, privacyHref }: ContactFormProps) {
  const errorText = (field: LeadField): string | undefined => {
    const code = form.errors[field];
    return code === undefined ? undefined : content.errors[code];
  };
  const describe = (field: LeadField) => (form.errors[field] ? `${field}-error` : undefined);

  return (
    <Form method="post" className="grid gap-4" aria-busy={form.isSubmitting}>
      <h2 className="lp-display lp-med">{content.title}</h2>

      {form.formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {form.formError === 'rate_limited' ? content.errors.rateLimited : content.errors.unavailable}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="name" label={content.labels.name} error={errorText('name')}>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            defaultValue={form.values.name}
            placeholder={content.placeholders.name}
            aria-invalid={form.errors.name ? true : undefined}
            aria-describedby={describe('name')}
            className={FIELD_CLASS}
          />
        </Field>
        <Field id="restaurantName" label={content.labels.restaurantName} error={errorText('restaurantName')}>
          <Input
            id="restaurantName"
            name="restaurantName"
            required
            autoComplete="organization"
            defaultValue={form.values.restaurantName}
            placeholder={content.placeholders.restaurantName}
            aria-invalid={form.errors.restaurantName ? true : undefined}
            aria-describedby={describe('restaurantName')}
            className={FIELD_CLASS}
          />
        </Field>
        <Field id="phone" label={content.labels.phone} error={errorText('phone')}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            dir="ltr"
            required
            autoComplete="tel"
            inputMode="tel"
            defaultValue={form.values.phone}
            placeholder={content.placeholders.phone}
            aria-invalid={form.errors.phone ? true : undefined}
            aria-describedby={describe('phone')}
            className={`${FIELD_CLASS} text-start`}
          />
        </Field>
        <Field id="email" label={content.labels.email} error={errorText('email')}>
          <Input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            required
            autoComplete="email"
            defaultValue={form.values.email}
            placeholder={content.placeholders.email}
            aria-invalid={form.errors.email ? true : undefined}
            aria-describedby={describe('email')}
            className={`${FIELD_CLASS} text-start`}
          />
        </Field>
        <Field id="country" label={content.labels.country} error={errorText('country')}>
          <select
            id="country"
            name="country"
            required
            defaultValue={form.values.country}
            aria-invalid={form.errors.country ? true : undefined}
            aria-describedby={describe('country')}
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:border-destructive md:text-sm"
          >
            <option value="" disabled>
              {content.countryPlaceholder}
            </option>
            {content.countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="branches" label={content.labels.branches} error={errorText('branches')}>
          <Input
            id="branches"
            name="branches"
            type="number"
            min={1}
            max={999}
            step={1}
            required
            inputMode="numeric"
            defaultValue={form.values.branches}
            aria-invalid={form.errors.branches ? true : undefined}
            aria-describedby={describe('branches')}
            className={FIELD_CLASS}
          />
        </Field>
      </div>

      <Field id="message" label={content.labels.message} error={errorText('message')}>
        <Textarea
          id="message"
          name="message"
          rows={3}
          maxLength={1000}
          defaultValue={form.values.message}
          placeholder={content.placeholders.message}
          aria-invalid={form.errors.message ? true : undefined}
          aria-describedby={describe('message')}
          className="bg-card"
        />
      </Field>

      {/* Honeypot: off-screen and skipped by keyboards and screen readers; only bots fill it. */}
      <div aria-hidden className="absolute -start-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="attribution" value={form.attribution} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" size="touch" isLoading={form.isSubmitting}>
          {form.isSubmitting ? content.sending : content.submit}
        </Button>
        <p className="text-sm text-foreground/75">
          {content.privacyNote}{' '}
          <a className="underline underline-offset-4" href={privacyHref}>
            {content.privacyLink}
          </a>
        </p>
      </div>
    </Form>
  );
}
