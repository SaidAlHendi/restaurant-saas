import { Injectable } from '@nestjs/common';

import type { PermissionKey } from '@app/shared';

import type { DrizzleTx } from '../../core/db/with-org';
import type { users } from '../../core/db/schema/identity';

import { IdentityRepository } from './identity.repository';
import { PinVerificationService } from './pin-verification.service';

export type CreateStaffUserInput = {
  id: string;
  email: string | null;
  passwordHash: string | null;
  name: string;
  locale: 'ar' | 'en';
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly pinVerification: PinVerificationService,
  ) {}

  async getDisplayNamesByMembershipIds(
    tx: DrizzleTx,
    membershipIds: string[],
  ): Promise<Map<string, string | null>> {
    const unique = [...new Set(membershipIds)];
    return this.repo.findDisplayNamesByMembershipIds(tx, unique);
  }

  findUserByEmail(tx: DrizzleTx, email: string): Promise<typeof users.$inferSelect | undefined> {
    return this.repo.findUserByEmail(tx, email);
  }

  createStaffUser(tx: DrizzleTx, input: CreateStaffUserInput): Promise<typeof users.$inferSelect> {
    return this.repo.insertUser(tx, {
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      locale: input.locale,
    });
  }

  updateUserName(tx: DrizzleTx, userId: string, name: string): Promise<void> {
    return this.repo.updateUserProfile(tx, userId, { name });
  }

  revokeSessionsForUserOrg(tx: DrizzleTx, userId: string, orgId: string): Promise<void> {
    return this.repo.revokeSessionsForUserOrg(tx, userId, orgId);
  }

  verifyMembershipPin(
    tx: DrizzleTx,
    orgId: string,
    branchId: string,
    membershipId: string,
    pin: string,
  ): Promise<void> {
    return this.pinVerification.verifyMembershipPin(tx, orgId, branchId, membershipId, pin);
  }

  verifyApproverPin(
    orgId: string,
    branchId: string,
    membershipId: string,
    pin: string,
    requiredPermission: PermissionKey,
  ): Promise<string> {
    return this.pinVerification.verifyApproverPin(
      orgId,
      branchId,
      membershipId,
      pin,
      requiredPermission,
    );
  }
}
