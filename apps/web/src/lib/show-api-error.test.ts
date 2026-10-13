import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { describe, expect, it } from 'vitest';

import { messageFromApiError } from './show-api-error.js';

function apiError(status: number, code: string, message: string): FetchBaseQueryError {
  return {
    status,
    data: { error: { code, message } },
  };
}

const t = ((key: string) => key) as Parameters<typeof messageFromApiError>[1];

describe('messageFromApiError', () => {
  it('maps known API codes to i18n keys', () => {
    expect(messageFromApiError(apiError(400, 'VALIDATION_ERROR', 'Bad field'), t)).toBe(
      'common.errors.validation',
    );
    expect(messageFromApiError(apiError(404, 'NOT_FOUND', 'Missing'), t)).toBe('common.errors.notFound');
    expect(messageFromApiError(apiError(409, 'LAST_OWNER', 'Cannot remove the last owner'), t)).toBe(
      'common.errors.lastOwner',
    );
    expect(messageFromApiError(apiError(403, 'FORBIDDEN', 'Cannot manage this member'), t)).toBe(
      'common.errors.forbidden',
    );
    expect(messageFromApiError(apiError(409, 'STAFF_ALREADY_MEMBER', 'Already a member'), t)).toBe(
      'common.errors.staffAlreadyMember',
    );
    expect(
      messageFromApiError(apiError(400, 'MEMBERSHIP_NOT_ACTIVE_OR_DISABLED', 'Bad status'), t),
    ).toBe('common.errors.membershipNotActiveOrDisabled');
    expect(messageFromApiError(apiError(400, 'FILE_TOO_LARGE', 'Huge'), t)).toBe(
      'common.errors.fileTooLarge',
    );
    expect(messageFromApiError(apiError(400, 'UNSUPPORTED_IMAGE_TYPE', 'GIF'), t)).toBe(
      'common.errors.unsupportedImageType',
    );
  });

  it('ignores server English message and uses generic fallback', () => {
    expect(messageFromApiError(apiError(500, 'INTERNAL', 'Database exploded'), t)).toBe(
      'common.errors.generic',
    );
    expect(messageFromApiError(apiError(409, 'LAST_OWNER', 'Cannot remove the last owner'), t)).not.toBe(
      'Cannot remove the last owner',
    );
  });

  it('returns generic for unknown errors', () => {
    expect(messageFromApiError(null, t)).toBe('common.errors.generic');
  });
});
