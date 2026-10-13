import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { describe, expect, it } from 'vitest';

import { acceptInviteErrorMessage, isInviteExpiredError } from './auth-invite-errors.utils.js';

function apiError(status: number, code: string): FetchBaseQueryError {
  return {
    status,
    data: { error: { code, message: 'ignored' } },
  };
}

const t = ((key: string) => key) as Parameters<typeof acceptInviteErrorMessage>[1];

describe('acceptInviteErrorMessage', () => {
  it('maps invite-specific errors', () => {
    expect(acceptInviteErrorMessage(apiError(410, 'INVITE_EXPIRED'), t)).toBe('auth.invite.expired');
    expect(acceptInviteErrorMessage(apiError(404, 'NOT_FOUND'), t)).toBe('auth.invite.noLongerValid');
    expect(acceptInviteErrorMessage(apiError(401, 'INVALID_CREDENTIALS'), t)).toBe(
      'auth.invite.wrongPassword',
    );
    expect(acceptInviteErrorMessage(apiError(500, 'INTERNAL'), t)).toBe('auth.invite.error');
  });
});

describe('isInviteExpiredError', () => {
  it('treats expired and revoked-or-used (404) invites as no longer valid for preview UX', () => {
    expect(isInviteExpiredError(apiError(410, 'INVITE_EXPIRED'))).toBe(true);
    expect(isInviteExpiredError(apiError(404, 'NOT_FOUND'))).toBe(true);
    expect(isInviteExpiredError(apiError(401, 'INVALID_CREDENTIALS'))).toBe(false);
  });
});
