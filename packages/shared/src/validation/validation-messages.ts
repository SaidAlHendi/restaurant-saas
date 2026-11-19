import { z } from 'zod';

/** Same shape as i18next's `t`, so the apps can pass it straight in. */
export type ValidationTranslate = (key: string, params?: Record<string, unknown>) => string;

/**
 * Makes zod's default errors ("Invalid input", "Too small: expected string…") say what is wrong.
 * Schemas that set their own `message` still win. `t` is called when a form is validated, so a
 * language switch applies right away. Keys live under `validation.*` in each app's locale files.
 */
export function registerValidationMessages(t: ValidationTranslate): void {
  z.config({
    customError: (issue) => {
      switch (issue.code) {
        case 'invalid_type':
          return issue.input === undefined || issue.input === null
            ? t('validation.required')
            : t('validation.invalidType');
        case 'too_small':
          if (issue.origin === 'string' || issue.origin === 'array') {
            const min = Number(issue.minimum);
            if (min <= 1) return t('validation.required');
            return t(
              issue.origin === 'string' ? 'validation.tooShort' : 'validation.tooFewItems',
              { count: min },
            );
          }
          return t('validation.tooSmall', { min: String(issue.minimum) });
        case 'too_big':
          if (issue.origin === 'string' || issue.origin === 'array') {
            return t(issue.origin === 'string' ? 'validation.tooLong' : 'validation.tooManyItems', {
              count: Number(issue.maximum),
            });
          }
          return t('validation.tooBig', { max: String(issue.maximum) });
        case 'invalid_format':
          return issue.format === 'email' ? t('validation.email') : t('validation.invalidFormat');
        case 'invalid_value':
          return t('validation.invalidValue');
        default:
          return undefined;
      }
    },
  });
}
