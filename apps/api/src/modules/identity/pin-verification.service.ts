import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';

import type { PermissionKey } from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { DrizzleTx } from '../../core/db/with-org';
import { setOrgLocal } from '../../core/db/with-org';
import {
  ForbiddenError,
  LockedError,
  NotFoundError,
  UnauthorizedError,
} from '../../core/errors/app-errors';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import { IdentityRepository } from './identity.repository';

const PIN_LOCK_FAILURE_THRESHOLD = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;

type MembershipPinRow = {
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedUntil: Date | null;
  status: string;
  orgId: string;
  roleId: string;
};

@Injectable()
export class PinVerificationService implements OnModuleInit {
  private timingMitigationPinHash = '';

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly identityRepo: IdentityRepository,
    private readonly tenancyRepo: TenancyRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    this.timingMitigationPinHash = await argon2.hash('local-pin-timing-mitigation-v1', {
      type: argon2.argon2id,
    });
  }

  async verifyMembershipPin(
    tx: DrizzleTx,
    orgId: string,
    branchId: string,
    membershipId: string,
    pin: string,
  ): Promise<void> {
    await this.verifyPinCore(tx, orgId, branchId, membershipId, pin, null);
  }

  async verifyApproverPin(
    tx: DrizzleTx,
    orgId: string,
    branchId: string,
    membershipId: string,
    pin: string,
    requiredPermission: PermissionKey,
  ): Promise<void> {
    await this.verifyPinCore(tx, orgId, branchId, membershipId, pin, requiredPermission);
  }

  private async verifyPinCore(
    tx: DrizzleTx,
    orgId: string,
    branchId: string,
    membershipId: string,
    pin: string,
    requiredPermission: PermissionKey | null,
  ): Promise<void> {
    const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
    if (!row || row.membership.orgId !== orgId) {
      throw new NotFoundError();
    }
    if (row.membership.status !== 'active') {
      throw new NotFoundError();
    }

    if (requiredPermission !== null) {
      const permissions = await this.tenancyRepo.loadRolePermissions(tx, row.role.id);
      if (!permissions.includes(requiredPermission)) {
        throw new ForbiddenError('Approver lacks permission');
      }
    }

    const hasBranch = await this.tenancyRepo.membershipHasBranchAccess(tx, membershipId, branchId);
    if (!hasBranch) {
      throw new ForbiddenError('Approver lacks branch access');
    }

    const now = this.clock.now();
    this.assertNotLocked(
      {
        pinHash: row.membership.pinHash,
        pinFailedAttempts: row.membership.pinFailedAttempts,
        pinLockedUntil: row.membership.pinLockedUntil,
        status: row.membership.status,
        orgId: row.membership.orgId,
        roleId: row.role.id,
      },
      now,
    );

    const pinHash = row.membership.pinHash;
    const valid = await this.verifyPinValue(pin, pinHash);
    if (!valid) {
      await this.recordFailedPinAttempt(orgId, membershipId);
      throw new UnauthorizedError('PIN_INVALID', 'Invalid PIN');
    }

    await this.tenancyRepo.updateMembership(tx, membershipId, {
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    });
  }

  private assertNotLocked(membership: MembershipPinRow, now: Date): void {
    const lockedUntil = membership.pinLockedUntil;
    if (lockedUntil !== null && lockedUntil.getTime() > now.getTime()) {
      throw new LockedError('PIN_LOCKED', 'PIN is temporarily locked', {
        lockedUntil: lockedUntil.toISOString(),
      });
    }
  }

  private async verifyPinValue(pin: string, pinHash: string | null): Promise<boolean> {
    if (pinHash === null || pinHash.length === 0) {
      await argon2.verify(this.timingMitigationPinHash, pin);
      return false;
    }
    return argon2.verify(pinHash, pin);
  }

  async recordFailedPinAttempt(orgId: string, membershipId: string): Promise<void> {
    const now = this.clock.now();
    const lockUntil = new Date(now.getTime() + PIN_LOCK_MS);

    await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(orgId));
      const result = await tx.execute(sql`
        UPDATE memberships
        SET
          pin_failed_attempts = pin_failed_attempts + 1,
          pin_locked_until = CASE
            WHEN pin_failed_attempts + 1 >= ${PIN_LOCK_FAILURE_THRESHOLD}
            THEN ${lockUntil}::timestamptz
            ELSE pin_locked_until
          END,
          updated_at = ${now}::timestamptz
        WHERE id = ${membershipId}::uuid
        RETURNING pin_failed_attempts, pin_locked_until
      `);
      const returned = result.rows[0];
      if (returned === undefined) {
        throw new NotFoundError();
      }
    });
  }
}
