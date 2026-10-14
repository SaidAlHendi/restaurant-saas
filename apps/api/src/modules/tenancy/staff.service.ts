import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import {
  canInviteRole,
  canManageMember,
  pinOnlyRoleKeySchema,
  type CreatePinOnlyStaffBody,
  type CreateStaffInviteBody,
  type PatchStaffMembershipBody,
  type PutStaffPinBody,
  type StaffRulesChange,
  type SystemRoleKey,
} from '@app/shared';

import { ENV, type Env } from '../../config/config.module';
import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { DrizzleTx } from '../../core/db/with-org';
import { withOrg } from '../../core/db/with-org';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../core/errors/app-errors';
import { generateInviteToken, inviteExpiresAt } from '../../lib/invite-token';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { newUuidV7 } from '../../lib/uuid';
import { EntitlementsService } from '../billing/entitlements.service';
import { IdentityService } from '../identity/identity.service';
import { MailService } from '../notifications/mail.service';

import {
  assertUsersPerBranchSeats,
  branchesAddedByMembershipChange,
  branchesForNewMember,
} from './staff-seat-enforcement';
import { TenancyRepository } from './tenancy.repository';

@Injectable()
export class StaffService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tenancyRepo: TenancyRepository,
    private readonly identity: IdentityService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly entitlements: EntitlementsService,
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
    const email = body.email.toLowerCase();
    const { raw, hash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(this.clock.now());

    const created = await withOrg(this.db, ctx.orgId, async (tx) => {
      await this.assertBranchScope(ctx, body.allBranches, body.branchIds, tx);
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

      let user = await this.identity.findUserByEmail(tx, email);
      if (!user) {
        user = await this.identity.createStaffUser(tx, {
          id: newUuidV7(),
          email,
          passwordHash: null,
          name: body.name ?? email.split('@')[0] ?? 'Staff',
          locale: 'en',
        });
      }

      const activeBranchIds = await this.tenancyRepo.listActiveBranchIds(tx, ctx.orgId);
      const targetBranches = branchesForNewMember(
        body.allBranches,
        body.branchIds,
        activeBranchIds,
      );
      await assertUsersPerBranchSeats(
        this.entitlements,
        this.tenancyRepo,
        tx,
        ctx.orgId,
        targetBranches,
        'add_one',
      );

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

      const orgName = (await this.tenancyRepo.findOrganizationById(tx, ctx.orgId))?.name ?? '';
      const inviteUrl = `${this.env.WEB_APP_URL}/invite/${raw}`;

      return {
        membershipId,
        inviteUrl,
        inviteExpiresAt: expiresAt.toISOString(),
        mail: { to: email, inviteUrl, orgName },
      };
    });

    this.mail.sendInvite(created.mail);
    return {
      membershipId: created.membershipId,
      inviteUrl: created.inviteUrl,
      inviteExpiresAt: created.inviteExpiresAt,
    };
  }

  async regenerateInvite(ctx: RequestContext, membershipId: string) {
    const { raw, hash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(this.clock.now());

    const regenerated = await withOrg(this.db, ctx.orgId, async (tx) => {
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
        row.membership.allBranches,
        {},
      );

      await this.tenancyRepo.updateMembership(tx, membershipId, {
        inviteTokenHash: hash,
        inviteExpiresAt: expiresAt,
      });

      const inviteUrl = `${this.env.WEB_APP_URL}/invite/${raw}`;
      const orgName = (await this.tenancyRepo.findOrganizationById(tx, ctx.orgId))?.name ?? '';
      const mail =
        row.user.email !== null
          ? { to: row.user.email, inviteUrl, orgName }
          : null;

      return {
        membershipId,
        inviteUrl,
        inviteExpiresAt: expiresAt.toISOString(),
        mail,
      };
    });

    if (regenerated.mail !== null) {
      this.mail.sendInvite(regenerated.mail);
    }
    return {
      membershipId: regenerated.membershipId,
      inviteUrl: regenerated.inviteUrl,
      inviteExpiresAt: regenerated.inviteExpiresAt,
    };
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
        row.membership.allBranches,
        {},
      );

      await this.tenancyRepo.deleteMembership(tx, membershipId);
    });
  }

  async createPinOnly(ctx: RequestContext, body: CreatePinOnlyStaffBody) {
    const pinHash = await argon2.hash(body.pin, { type: argon2.argon2id });
    const userId = newUuidV7();
    const membershipId = newUuidV7();

    return withOrg(this.db, ctx.orgId, async (tx) => {
      await this.assertBranchScope(ctx, body.allBranches, body.branchIds, tx);
      const actorRole = await this.actorRoleKey(tx, ctx);
      if (!canInviteRole(actorRole, body.roleKey)) {
        throw new ForbiddenError('Cannot create this role');
      }
      const role = await this.tenancyRepo.findRoleByKey(tx, body.roleKey);
      if (!role) {
        throw new ValidationError('Invalid role');
      }

      const activeBranchIds = await this.tenancyRepo.listActiveBranchIds(tx, ctx.orgId);
      const targetBranches = branchesForNewMember(
        body.allBranches,
        body.branchIds,
        activeBranchIds,
      );
      await assertUsersPerBranchSeats(
        this.entitlements,
        this.tenancyRepo,
        tx,
        ctx.orgId,
        targetBranches,
        'add_one',
      );

      await this.identity.createStaffUser(tx, {
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

      const isSelf = row.membership.id === ctx.membershipId;

      if (body.name !== undefined && row.user.email !== null) {
        throw new ValidationError('Name can only be changed for PIN-only staff');
      }

      const change: StaffRulesChange = {
        roleKey: body.roleKey,
        status: body.status,
        allBranches: body.allBranches,
        branchIds: body.branchIds,
      };
      const hasManagementChange =
        change.roleKey !== undefined ||
        change.status !== undefined ||
        change.allBranches !== undefined ||
        change.branchIds !== undefined;

      if (!isSelf || hasManagementChange) {
        await this.assertCanManageTx(
          tx,
          ctx,
          row.membership.id,
          row.role.key as SystemRoleKey,
          row.membership.status,
          row.membership.allBranches,
          change,
        );
      }

      if (body.status !== undefined) {
        if (row.membership.status === 'invited') {
          throw new ValidationError(
            'Only active or disabled members can change status',
            {},
            'MEMBERSHIP_NOT_ACTIVE_OR_DISABLED',
          );
        }
      }

      if (body.roleKey !== undefined && row.user.email === null) {
        const roleCheck = pinOnlyRoleKeySchema.safeParse(body.roleKey);
        if (!roleCheck.success) {
          throw new ValidationError('PIN-only staff cannot be assigned this role', {}, 'VALIDATION_ERROR');
        }
      }

      if (body.allBranches !== undefined || body.branchIds !== undefined) {
        const allBranches = body.allBranches ?? row.membership.allBranches;
        const branchIds = body.branchIds ?? (await this.tenancyRepo.listMembershipBranchIds(tx, membershipId));
        await this.assertBranchScope(ctx, allBranches, branchIds, tx);
      }

      if (body.roleKey !== undefined) {
        const role = await this.tenancyRepo.findRoleByKey(tx, body.roleKey);
        if (!role) {
          throw new ValidationError('Invalid role');
        }
        await this.tenancyRepo.updateMembership(tx, membershipId, { roleId: role.id });
      }

      const activeBranchIds = await this.tenancyRepo.listActiveBranchIds(tx, ctx.orgId);
      const currentBranchIds = await this.tenancyRepo.listMembershipBranchIds(tx, membershipId);

      if (body.status === 'active' && row.membership.status === 'disabled') {
        const accessBranches = branchesForNewMember(
          row.membership.allBranches,
          currentBranchIds,
          activeBranchIds,
        );
        await assertUsersPerBranchSeats(
          this.entitlements,
          this.tenancyRepo,
          tx,
          ctx.orgId,
          accessBranches,
          'add_one',
        );
      }

      const nextStatus = body.status ?? row.membership.status;
      const countsForSeats = nextStatus === 'active' || nextStatus === 'invited';

      const nextAllBranches = body.allBranches ?? row.membership.allBranches;
      const nextBranchIds =
        body.branchIds ??
        (nextAllBranches ? activeBranchIds : currentBranchIds);
      if (
        countsForSeats &&
        (body.allBranches !== undefined || body.branchIds !== undefined)
      ) {
        const added = branchesAddedByMembershipChange(
          row.membership.allBranches,
          currentBranchIds,
          nextAllBranches,
          nextBranchIds,
          activeBranchIds,
        );
        if (added.length > 0) {
          await assertUsersPerBranchSeats(
            this.entitlements,
            this.tenancyRepo,
            tx,
            ctx.orgId,
            added,
            'add_one',
          );
        }
      }

      if (body.status !== undefined) {
        await this.tenancyRepo.updateMembership(tx, membershipId, { status: body.status });
        if (body.status === 'disabled') {
          await this.identity.revokeSessionsForUserOrg(tx, row.user.id, ctx.orgId);
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
        await this.identity.updateUserName(tx, row.user.id, body.name);
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
          row.membership.allBranches,
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
          row.membership.allBranches,
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
    tx: DrizzleTx,
    ctx: RequestContext,
    targetMembershipId: string,
    targetRoleKey: SystemRoleKey,
    targetStatus: 'active' | 'invited' | 'disabled',
    targetAllBranches: boolean,
    change: StaffRulesChange,
  ): Promise<void> {
    await this.assertActorCanManageMemberBranches(tx, ctx, targetMembershipId, targetAllBranches);

    const actorRole = await this.actorRoleKey(tx, ctx);
    let activeOwnerCount: number;
    if (this.changeMayRemoveActiveOwner(targetRoleKey, targetStatus, change)) {
      const locked = await this.tenancyRepo.lockActiveOwnerMembershipsForUpdate(tx, ctx.orgId);
      activeOwnerCount = locked.length;
    } else {
      activeOwnerCount = await this.tenancyRepo.countActiveOwners(tx, ctx.orgId);
    }
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
      throw new ForbiddenError('Cannot manage this member', {}, 'FORBIDDEN');
    }
  }

  private async assertActorCanManageMemberBranches(
    tx: DrizzleTx,
    ctx: RequestContext,
    targetMembershipId: string,
    targetAllBranches: boolean,
  ): Promise<void> {
    if (ctx.allBranches) {
      return;
    }
    if (targetAllBranches) {
      throw new ForbiddenError('Cannot manage this member', {}, 'FORBIDDEN');
    }
    const targetBranchIds = await this.tenancyRepo.listMembershipBranchIds(tx, targetMembershipId);
    const allowed = new Set(ctx.branchIds);
    for (const branchId of targetBranchIds) {
      if (!allowed.has(branchId)) {
        throw new ForbiddenError('Cannot manage this member', {}, 'FORBIDDEN');
      }
    }
  }

  private changeMayRemoveActiveOwner(
    targetRoleKey: SystemRoleKey,
    targetStatus: 'active' | 'invited' | 'disabled',
    change: StaffRulesChange,
  ): boolean {
    if (targetRoleKey !== 'owner' || targetStatus !== 'active') {
      return false;
    }
    const demotingOwner = change.roleKey !== undefined && change.roleKey !== 'owner';
    const disablingOwner = change.status === 'disabled';
    return demotingOwner || disablingOwner;
  }

  private async actorRoleKey(tx: DrizzleTx, ctx: RequestContext): Promise<SystemRoleKey> {
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
    tx: DrizzleTx,
  ): Promise<void> {
    if (!ctx.allBranches) {
      if (allBranches) {
        throw new ForbiddenError('Cannot assign all branches', {}, 'FORBIDDEN');
      }
      const allowed = new Set(ctx.branchIds);
      for (const branchId of branchIds) {
        if (!allowed.has(branchId)) {
          throw new ForbiddenError('Branch is outside your scope', {}, 'FORBIDDEN');
        }
      }
    }
    if (allBranches) {
      return;
    }
    if (branchIds.length === 0) {
      throw new ValidationError('At least one branch is required when allBranches is false');
    }
    for (const branchId of branchIds) {
      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch || branch.orgId !== ctx.orgId) {
        throw new ValidationError('Branch is not in this organization', { branchId });
      }
    }
  }
}
