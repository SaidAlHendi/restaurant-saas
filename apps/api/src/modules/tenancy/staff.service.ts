import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import type {
  CreatePinOnlyStaffBody,
  CreateStaffInviteBody,
  PatchStaffMembershipBody,
  PutStaffPinBody,
  SystemRoleKey,
} from '@app/shared';

import { ENV, type Env } from '../../config/config.module';
import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../core/errors/app-errors';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { newUuidV7 } from '../../lib/uuid';
import { MailService } from '../notifications/mail.service';
import { IdentityRepository } from '../identity/identity.repository';

import { generateInviteToken, inviteExpiresAt } from './invite-token';
import { canInviteRole, canManageMember } from './staff-rules';
import { TenancyRepository } from './tenancy.repository';

@Injectable()
export class StaffService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tenancyRepo: TenancyRepository,
    private readonly identityRepo: IdentityRepository,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.tenancyRepo.listStaffWithUsers(tx);
      const items = await Promise.all(
        rows.map(async (row) => {
          const branchIds = row.membership.allBranches
            ? []
            : await this.tenancyRepo.listMembershipBranchIds(tx, row.membership.id);
          return {
            id: row.membership.id,
            userId: row.user.id,
            name: row.user.name,
            email: row.user.email,
            roleKey: row.role.key as SystemRoleKey,
            status: row.membership.status,
            allBranches: row.membership.allBranches,
            branchIds,
            hasPin: row.membership.pinHash !== null && row.membership.pinHash.length > 0,
            inviteExpiresAt: row.membership.inviteExpiresAt
              ? row.membership.inviteExpiresAt.toISOString()
              : null,
            isSelf: row.membership.id === ctx.membershipId,
          };
        }),
      );
      return { items };
    });
  }

  async createInvite(ctx: RequestContext, body: CreateStaffInviteBody) {
    await this.assertBranchScope(ctx, body.allBranches, body.branchIds);

    const email = body.email.toLowerCase();
    const { raw, hash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(this.clock.now());

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const actorRole = await this.actorRoleKey(tx, ctx);
      if (!canInviteRole(actorRole, body.roleKey)) {
        throw new ForbiddenError('Cannot invite this role');
      }
      const existing = await this.tenancyRepo.findMembershipByOrgAndEmail(tx, ctx.orgId, email);
      if (existing) {
        throw new ConflictError('Staff already a member of this organization', {}, 'STAFF_ALREADY_MEMBER');
      }

      const role = await this.tenancyRepo.findRoleByKey(tx, body.roleKey);
      if (!role) {
        throw new ValidationError('Invalid role');
      }

      let user = await this.identityRepo.findUserByEmail(tx, email);
      if (!user) {
        user = await this.identityRepo.insertUser(tx, {
          id: newUuidV7(),
          email,
          passwordHash: null,
          name: body.name ?? email.split('@')[0] ?? 'Staff',
          locale: 'en',
        });
      }

      const membershipId = newUuidV7();
      try {
        await this.tenancyRepo.insertMembership(tx, {
          id: membershipId,
          orgId: ctx.orgId,
          userId: user.id,
          roleId: role.id,
          allBranches: body.allBranches,
          status: 'invited',
          inviteTokenHash: hash,
          inviteExpiresAt: expiresAt,
          invitedByMembershipId: ctx.membershipId,
        });
      } catch (err: unknown) {
        if (isPgUniqueViolation(err, 'memberships_org_user_unique')) {
          throw new ConflictError(
            'Staff already a member of this organization',
            {},
            'STAFF_ALREADY_MEMBER',
          );
        }
        throw err;
      }

      if (!body.allBranches) {
        await this.tenancyRepo.replaceMembershipBranches(tx, membershipId, ctx.orgId, body.branchIds);
      }

      const inviteUrl = `${this.env.WEB_APP_URL}/invite/${raw}`;
      this.mail.sendInvite({ to: email, inviteUrl, orgName: (await this.tenancyRepo.findOrganizationById(tx, ctx.orgId))?.name ?? '' });

      return {
        membershipId,
        inviteUrl,
        inviteExpiresAt: expiresAt.toISOString(),
      };
    });
  }

  async regenerateInvite(ctx: RequestContext, membershipId: string) {
    const { raw, hash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(this.clock.now());

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!row || row.membership.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      if (row.membership.status !== 'invited') {
        throw new ValidationError('Membership is not invited');
      }
      await this.assertCanManageTx(
        tx,
        ctx,
        row.membership.id,
        row.role.key as SystemRoleKey,
        row.membership.status,
        {},
      );

      await this.tenancyRepo.updateMembership(tx, membershipId, {
        inviteTokenHash: hash,
        inviteExpiresAt: expiresAt,
      });

      const inviteUrl = `${this.env.WEB_APP_URL}/invite/${raw}`;
      if (row.user.email) {
        this.mail.sendInvite({
          to: row.user.email,
          inviteUrl,
          orgName: (await this.tenancyRepo.findOrganizationById(tx, ctx.orgId))?.name ?? '',
        });
      }

      return {
        membershipId,
        inviteUrl,
        inviteExpiresAt: expiresAt.toISOString(),
      };
    });
  }

  async revokeInvite(ctx: RequestContext, membershipId: string) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!row || row.membership.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      if (row.membership.status !== 'invited') {
        throw new ValidationError('Membership is not invited');
      }
      await this.assertCanManageTx(
        tx,
        ctx,
        row.membership.id,
        row.role.key as SystemRoleKey,
        row.membership.status,
        {},
      );

      await this.tenancyRepo.deleteMembership(tx, membershipId);
    });
  }

  async createPinOnly(ctx: RequestContext, body: CreatePinOnlyStaffBody) {
    await this.assertBranchScope(ctx, body.allBranches, body.branchIds);

    const pinHash = await argon2.hash(body.pin, { type: argon2.argon2id });
    const userId = newUuidV7();
    const membershipId = newUuidV7();

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const actorRole = await this.actorRoleKey(tx, ctx);
      if (!canInviteRole(actorRole, body.roleKey)) {
        throw new ForbiddenError('Cannot create this role');
      }
      const role = await this.tenancyRepo.findRoleByKey(tx, body.roleKey);
      if (!role) {
        throw new ValidationError('Invalid role');
      }

      await this.identityRepo.insertUser(tx, {
        id: userId,
        email: null,
        passwordHash: null,
        name: body.name,
        locale: 'en',
      });

      await this.tenancyRepo.insertMembership(tx, {
        id: membershipId,
        orgId: ctx.orgId,
        userId,
        roleId: role.id,
        allBranches: body.allBranches,
        status: 'active',
        pinHash,
      });

      if (!body.allBranches) {
        await this.tenancyRepo.replaceMembershipBranches(tx, membershipId, ctx.orgId, body.branchIds);
      }

      return { membershipId, userId };
    });
  }

  async patchMembership(ctx: RequestContext, membershipId: string, body: PatchStaffMembershipBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!row || row.membership.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }

      const change = { roleKey: body.roleKey, status: body.status };
      await this.assertCanManageTx(
        tx,
        ctx,
        row.membership.id,
        row.role.key as SystemRoleKey,
        row.membership.status,
        change,
      );

      if (body.name !== undefined && row.user.email !== null) {
        throw new ValidationError('Name can only be changed for PIN-only staff');
      }

      if (body.allBranches !== undefined || body.branchIds !== undefined) {
        const allBranches = body.allBranches ?? row.membership.allBranches;
        const branchIds = body.branchIds ?? (await this.tenancyRepo.listMembershipBranchIds(tx, membershipId));
        await this.assertBranchScope(ctx, allBranches, branchIds);
      }

      if (body.roleKey !== undefined) {
        const role = await this.tenancyRepo.findRoleByKey(tx, body.roleKey);
        if (!role) {
          throw new ValidationError('Invalid role');
        }
        await this.tenancyRepo.updateMembership(tx, membershipId, { roleId: role.id });
      }

      if (body.status !== undefined) {
        await this.tenancyRepo.updateMembership(tx, membershipId, { status: body.status });
        if (body.status === 'disabled') {
          await this.identityRepo.revokeSessionsForUserOrg(tx, row.user.id, ctx.orgId);
        }
      }

      if (body.allBranches !== undefined) {
        await this.tenancyRepo.updateMembership(tx, membershipId, { allBranches: body.allBranches });
      }

      if (body.branchIds !== undefined || body.allBranches === false) {
        const allBranches = body.allBranches ?? row.membership.allBranches;
        if (!allBranches) {
          const branchIds =
            body.branchIds ?? (await this.tenancyRepo.listMembershipBranchIds(tx, membershipId));
          await this.tenancyRepo.replaceMembershipBranches(tx, membershipId, ctx.orgId, branchIds);
        } else {
          await this.tenancyRepo.replaceMembershipBranches(tx, membershipId, ctx.orgId, []);
        }
      }

      if (body.name !== undefined) {
        await this.identityRepo.updateUserProfile(tx, row.user.id, { name: body.name });
      }

      const updated = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!updated) {
        throw new NotFoundError();
      }
      return { id: updated.membership.id };
    });
  }

  async putPin(ctx: RequestContext, membershipId: string, body: PutStaffPinBody) {
    const isSelf = membershipId === ctx.membershipId;
    if (!isSelf && !ctx.permissions.includes('staff.manage')) {
      throw new ForbiddenError('Cannot set PIN for another member');
    }

    const pinHash = await argon2.hash(body.pin, { type: argon2.argon2id });

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!row || row.membership.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      if (!isSelf) {
        await this.assertCanManageTx(
          tx,
          ctx,
          row.membership.id,
          row.role.key as SystemRoleKey,
          row.membership.status,
          {},
        );
      }

      await this.tenancyRepo.updateMembership(tx, membershipId, {
        pinHash,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      });
    });
  }

  async deletePin(ctx: RequestContext, membershipId: string) {
    const isSelf = membershipId === ctx.membershipId;
    if (!isSelf && !ctx.permissions.includes('staff.manage')) {
      throw new ForbiddenError('Cannot remove PIN for another member');
    }

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.tenancyRepo.findMembershipWithUserRole(tx, membershipId);
      if (!row || row.membership.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      if (!isSelf) {
        await this.assertCanManageTx(
          tx,
          ctx,
          row.membership.id,
          row.role.key as SystemRoleKey,
          row.membership.status,
          {},
        );
      }

      await this.tenancyRepo.updateMembership(tx, membershipId, {
        pinHash: null,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      });
    });
  }

  private async assertCanManageTx(
    tx: Parameters<Parameters<DrizzleDb['transaction']>[0]>[0],
    ctx: RequestContext,
    targetMembershipId: string,
    targetRoleKey: SystemRoleKey,
    targetStatus: 'active' | 'invited' | 'disabled',
    change: { roleKey?: SystemRoleKey; status?: 'active' | 'disabled' },
  ): Promise<void> {
    const actorRole = await this.actorRoleKey(tx, ctx);
    const activeOwnerCount = await this.tenancyRepo.countActiveOwners(tx, ctx.orgId);
    const result = canManageMember(
      { membershipId: ctx.membershipId, roleKey: actorRole },
      { membershipId: targetMembershipId, roleKey: targetRoleKey, status: targetStatus },
      change,
      {
        isSelf: targetMembershipId === ctx.membershipId,
        activeOwnerCount,
      },
    );
    if (!result.ok) {
      if (result.reason === 'LAST_OWNER') {
        throw new ConflictError('Cannot remove the last owner', {}, 'LAST_OWNER');
      }
      throw new ForbiddenError('Cannot manage this member');
    }
  }

  private async actorRoleKey(
    tx: Parameters<Parameters<DrizzleDb['transaction']>[0]>[0],
    ctx: RequestContext,
  ): Promise<SystemRoleKey> {
    const row = await this.tenancyRepo.findMembershipWithUserRole(tx, ctx.membershipId);
    if (!row) {
      throw new ForbiddenError('Actor membership not found');
    }
    return row.role.key as SystemRoleKey;
  }

  private async assertBranchScope(
    ctx: RequestContext,
    allBranches: boolean,
    branchIds: string[],
  ): Promise<void> {
    if (allBranches) {
      return;
    }
    if (branchIds.length === 0) {
      throw new ValidationError('At least one branch is required when allBranches is false');
    }
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const orgBranchIds = new Set(await this.tenancyRepo.listBranchIdsForOrg(tx, ctx.orgId));
      for (const branchId of branchIds) {
        if (!orgBranchIds.has(branchId)) {
          throw new ValidationError('Branch is not in this organization', { branchId });
        }
      }
    });
  }
}
