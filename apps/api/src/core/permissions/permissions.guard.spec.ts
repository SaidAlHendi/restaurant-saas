import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

import { ForbiddenError } from '../errors/app-errors';
import { REQUEST_CONTEXT_KEY, type RequestContext } from '../context/request-context';
import { IS_AUTHENTICATED_KEY } from '../auth/authenticated.decorator';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { FEATURE_KEY } from './require-feature.decorator';
import { PERMISSION_KEY } from './require-permission.decorator';
import { PermissionsGuard } from './permissions.guard';
import { EntitlementsService } from '../../modules/billing/entitlements.service';

function mockContext(ctx: RequestContext): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ [REQUEST_CONTEXT_KEY]: ctx }),
    }),
  } as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const requestCtx: RequestContext = {
    orgId: '01932a1a-7b3e-7000-8000-000000000001',
    userId: '01932a1a-7b3e-7000-8000-000000000002',
    membershipId: '01932a1a-7b3e-7000-8000-000000000003',
    sessionId: '01932a1a-7b3e-7000-8000-000000000004',
    branchIds: [],
    allBranches: true,
    permissions: ['orders.create'],
  };

  it('calls entitlements.assertFeature when @RequireFeature is set', async () => {
    const assertFeature = jest.fn((_orgId: string, _key: string) => Promise.resolve(undefined));
    const entitlements = { assertFeature } as unknown as EntitlementsService;
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) {
          return false;
        }
        if (key === FEATURE_KEY) {
          return 'pos.access';
        }
        if (key === PERMISSION_KEY) {
          return 'orders.create';
        }
        if (key === IS_AUTHENTICATED_KEY) {
          return false;
        }
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, entitlements);
    await expect(guard.canActivate(mockContext(requestCtx))).resolves.toBe(true);
    expect(assertFeature).toHaveBeenCalledWith(requestCtx.orgId, 'pos.access');
  });

  it('denies when assertFeature throws', async () => {
    const assertFeature = jest.fn((_orgId: string, _key: string) =>
      Promise.reject(new ForbiddenError('Plan feature not available', {}, 'PLAN_FEATURE_REQUIRED')),
    );
    const entitlements = { assertFeature } as unknown as EntitlementsService;
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) {
          return false;
        }
        if (key === FEATURE_KEY) {
          return 'pos.access';
        }
        if (key === PERMISSION_KEY) {
          return 'orders.create';
        }
        if (key === IS_AUTHENTICATED_KEY) {
          return false;
        }
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, entitlements);
    await expect(guard.canActivate(mockContext(requestCtx))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
