import { Injectable } from '@nestjs/common';

import type { DrizzleTx } from '../../core/db/with-org';

import { IdentityRepository } from './identity.repository';

@Injectable()
export class IdentityService {
  constructor(private readonly repo: IdentityRepository) {}

  async getDisplayNamesByMembershipIds(
    tx: DrizzleTx,
    membershipIds: string[],
  ): Promise<Map<string, string | null>> {
    const unique = [...new Set(membershipIds)];
    return this.repo.findDisplayNamesByMembershipIds(tx, unique);
  }
}
