import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { ForbiddenError, UnauthorizedError, ValidationError } from '../../core/errors/app-errors';
import type { AccessTokenPayload } from '../../core/auth/jwt.service';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { authSessions } from '../../core/db/schema/identity';
import { setOrgLocal } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { TenancyRepository } from '../tenancy/tenancy.repository';
import { IdentityRepository } from './identity.repository';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthContextService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identityRepo: IdentityRepository,
    private readonly tenancyRepo: TenancyRepository,
  ) {}

  async buildFromAccessToken(
    payload: AccessTokenPayload,
    branchHeader: string | undefined,
  ): Promise<RequestContext> {
    const session = await this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(authSessions)
        .where(and(eq(authSessions.id, payload.sid), eq(authSessions.userId, payload.sub)))
        .limit(1);
      return rows[0];
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('SESSION_INVALID', 'Session is not active');
    }
    if (session.orgId !== payload.org) {
      throw new UnauthorizedError('SESSION_INVALID', 'Session is not active');
    }

    return this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(payload.org));
      const membership = await this.identityRepo.findMembershipForUserOrg(tx, payload.sub, payload.org);
      if (!membership || membership.status !== 'active') {
        throw new UnauthorizedError('MEMBERSHIP_DISABLED', 'Membership is not active');
      }
      const permissions = await this.tenancyRepo.loadRolePermissions(tx, membership.roleId);
      let branchIds: string[] = [];
      if (membership.allBranches) {
        const branchRows = await this.tenancyRepo.listBranches(tx, payload.org);
        branchIds = branchRows.filter((b) => b.isActive).map((b) => b.id);
      } else {
        branchIds = await this.tenancyRepo.listMembershipBranchIds(tx, membership.id);
      }

      let currentBranchId: string | undefined;
      if (branchHeader !== undefined && branchHeader.length > 0) {
        if (!UUID_RE.test(branchHeader)) {
          throw new ValidationError('Invalid X-Branch-Id header');
        }
        const branch = await this.tenancyRepo.findBranchById(tx, branchHeader);
        if (!branch || branch.orgId !== payload.org) {
          throw new ForbiddenError('Branch is not in scope');
        }
        if (!branchIds.includes(branchHeader)) {
          throw new ForbiddenError('Branch is not in scope');
        }
        currentBranchId = branchHeader;
      }

      return {
        userId: payload.sub,
        orgId: payload.org,
        membershipId: membership.id,
        sessionId: payload.sid,
        branchIds,
        allBranches: membership.allBranches,
        permissions,
        currentBranchId,
      };
    });
  }
}
