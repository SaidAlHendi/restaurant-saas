import { describe, expect, it } from 'vitest';

import { signupBodySchema } from '../auth/signup.js';
import { registerValidationMessages } from './validation-messages.js';

describe('registerValidationMessages', () => {
  it('replaces generic zod messages with specific ones', () => {
    registerValidationMessages((key, params) => `${key}:${typeof params?.count === 'number' ? String(params.count) : ''}`);
    const result = signupBodySchema.safeParse({ password: 'short', email: 'nope' });
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(
      (result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
    );
    expect(messages.password).toBe('validation.tooShort:10');
    expect(messages.email).toBe('validation.email:');
    expect(messages.name).toBe('validation.required:');
  });
});
