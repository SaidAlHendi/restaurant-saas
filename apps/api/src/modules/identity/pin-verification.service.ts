import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { eq, sql } from 'drizzle-orm';

import type { PermissionKey } from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { memberships } from '../../core/db/schema/tenancy';
import type { DrizzleTx } from '../../core/db/with-org';
import { setOrgLocal } from '../../core/db/with-org';
import {
  ForbiddenError,
  LockedError,
  NotFoundError,
  UnauthorizedError,
} from '../../core/errors/app-errors';
import { TenancyRepository } from '../tenancy/tenancy.repository';

const PIN_LOCK_FAILURE_THRESHOLD = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;

type ReservedPinAttempt = {
  pinFailedAttempts: number;
  pinLockedUntil: Date | null;
};

type PinAttemptRow = {
  pin_failed_attempts: number | string;
  pin_locked_until: Date | string | null;
};

function parsePinAttemptRow(row: PinAttemptRow): ReservedPinAttempt {
  const pinFailedAttempts =
    typeof row.pin_failed_attempts === 'number'
      ? row.pin_failed_attempts
      : Number(row.pin_failed_attempts);
  if (row.pin_locked_until === null) {
    return { pinFailedAttempts, pinLockedUntil: null };
  }
  const pinLockedUntil =
    row.pin_locked_until instanceof Date
      ? row.pin_locked_until
      : new Date(row.pin_locked_until);
  return { pinFailedAttempts, pinLockedUntil };
}

function lockedUntilIso(lockedUntil: Date | null, fallback: Date): string {
  if (lockedUntil === null) {
    return fallback.toISOString();
  }
  return lockedUntil.toISOString();
}

@Injectable()
export class PinVerificationService implements OnModuleInit {
  private timingMitigationPinHash = '';

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CLOCK) private readonly clock: Clock,
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

  /** Verifies approver PIN outside a long-running order transaction (returns approver membership id). */
  async verifyApproverPinStandalone(
    orgId: string,
    branchId: string,
    membershipId: string,
    pin: string,
    requiredPermission: PermissionKey,
  ): Promise<string> {
    const pinHash = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(orgId));
      const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!row || row.membership.orgId !== orgId) {
        throw new NotFoundError();
      }
      if (row.membership.status !== 'active') {
        throw new NotFoundError();
      }
      const permissions = await this.tenancyRepo.loadRolePermissions(tx, row.role.id);
      if (!permissions.includes(requiredPermission)) {
        throw new ForbiddenError('Approver lacks permission');
      }
      const hasBranch = await this.tenancyRepo.membershipHasBranchAccess(tx, membershipId, branchId);
      if (!hasBranch) {
        throw new ForbiddenError('Approver lacks branch access');
      }
      return row.membership.pinHash;
    });

    const reserved = await this.reservePinAttempt(orgId, membershipId);
    const valid = await this.verifyPinValue(pin, pinHash);

    if (valid) {
      await this.db.transaction(async (tx) => {
        await tx.execute(setOrgLocal(orgId));
        await this.tenancyRepo.updateMembership(tx, membershipId, {
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        });
      });
      return membershipId;
    }

    if (reserved.pinFailedAttempts >= PIN_LOCK_FAILURE_THRESHOLD) {
      throw new LockedError('PIN_LOCKED', 'PIN is temporarily locked', {
        lockedUntil: lockedUntilIso(reserved.pinLockedUntil, this.clock.now()),
      });
    }

    throw new UnauthorizedError('PIN_INVALID', 'Invalid PIN');
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

    const reserved = await this.reservePinAttempt(orgId, membershipId);
    const pinHash = row.membership.pinHash;
    const valid = await this.verifyPinValue(pin, pinHash);

    if (valid) {
      await this.tenancyRepo.updateMembership(tx, membershipId, {
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      });
      return;
    }

    if (reserved.pinFailedAttempts >= PIN_LOCK_FAILURE_THRESHOLD) {
      throw new LockedError('PIN_LOCKED', 'PIN is temporarily locked', {
        lockedUntil: lockedUntilIso(reserved.pinLockedUntil, this.clock.now()),
      });
    }

    throw new UnauthorizedError('PIN_INVALID', 'Invalid PIN');
  }

  private async verifyPinValue(pin: string, pinHash: string | null): Promise<boolean> {
    if (pinHash === null || pinHash.length === 0) {
      await argon2.verify(this.timingMitigationPinHash, pin);
      return false;
    }
    return argon2.verify(pinHash, pin);
  }

  private async reservePinAttempt(orgId: string, membershipId: string): Promise<ReservedPinAttempt> {
    const now = this.clock.now();
    const lockUntil = new Date(now.getTime() + PIN_LOCK_MS);

    const reserved = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(orgId));
      const result = await tx.execute(sql`
        UPDATE memberships
        SET
          pin_failed_attempts = CASE
            WHEN pin_locked_until IS NOT NULL AND pin_locked_until <= ${now}::timestamptz THEN 1
            ELSE pin_failed_attempts + 1
          END,
          pin_locked_until = CASE
            WHEN (
              CASE
                WHEN pin_locked_until IS NOT NULL AND pin_locked_until <= ${now}::timestamptz THEN 1
                ELSE pin_failed_attempts + 1
              END
            ) >= ${PIN_LOCK_FAILURE_THRESHOLD}
            THEN ${lockUntil}::timestamptz
            ELSE NULL
          END,
          updated_at = ${now}::timestamptz
        WHERE id = ${membershipId}::uuid
          AND org_id = ${orgId}::uuid
          AND (pin_locked_until IS NULL OR pin_locked_until <= ${now}::timestamptz)
        RETURNING pin_failed_attempts, pin_locked_until
      `);
      const returned = result.rows[0] as PinAttemptRow | undefined;
      return returned;
    });

    if (reserved !== undefined) {
      return parsePinAttemptRow(reserved);
    }

    const lockedUntil = await this.db.transaction(async (tx) => {
      await tx.execute(setOrgLocal(orgId));
      const rows = await tx
        .select({ pinLockedUntil: memberships.pinLockedUntil })
        .from(memberships)
        .where(eq(memberships.id, membershipId))
        .limit(1);
      return rows[0]?.pinLockedUntil ?? null;
    });

    throw new LockedError('PIN_LOCKED', 'PIN is temporarily locked', {
      lockedUntil: lockedUntilIso(lockedUntil, now),
    });
  }
}
