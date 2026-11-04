import { ForbiddenError } from '../../core/errors/app-errors';

/** Org statuses that lock all tenant access (login, refresh, API calls). */
const BLOCKED_ORG_STATUSES = new Set<string>(['suspended', 'cancelled']);

export function isOrgBlocked(status: string): boolean {
  return BLOCKED_ORG_STATUSES.has(status);
}

export function orgBlockedError(status: string): ForbiddenError {
  if (status === 'cancelled') {
    return new ForbiddenError(
      'This account has been cancelled. Contact support.',
      { status },
      'ORG_CANCELLED',
    );
  }
  return new ForbiddenError(
    'This account has been suspended. Contact support.',
    { status },
    'ORG_SUSPENDED',
  );
}

export function assertOrgActive(status: string): void {
  if (isOrgBlocked(status)) {
    throw orgBlockedError(status);
  }
}
