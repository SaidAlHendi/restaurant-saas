import { randomInt } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  type CreatePosDeviceBody,
  type CreatePosDeviceResponse,
  type PosDeviceListItem,
  type PosDeviceListResponse,
} from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { posDevices } from '../../core/db/schema/tenancy';
import { withOrg } from '../../core/db/with-org';
import { ForbiddenError, NotFoundError } from '../../core/errors/app-errors';
import { hashInviteToken } from '../../lib/invite-token';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { newUuidV7 } from '../../lib/uuid';

import { TenancyRepository } from './tenancy.repository';

export const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;

function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < PAIRING_CODE_LENGTH; i += 1) {
    code += PAIRING_CODE_ALPHABET.charAt(randomInt(PAIRING_CODE_ALPHABET.length));
  }
  return code;
}

function toListItem(
  device: typeof posDevices.$inferSelect,
  branchName: string,
): PosDeviceListItem {
  return {
    id: device.id,
    name: device.name,
    branchId: device.branchId,
    branchName,
    status: device.status,
    pairingExpiresAt: device.pairingExpiresAt?.toISOString() ?? null,
    pairedAt: device.pairedAt?.toISOString() ?? null,
    lastUsedAt: device.lastUsedAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
  };
}

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly repo: TenancyRepository,
  ) {}

  list(ctx: RequestContext): Promise<PosDeviceListResponse> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listPosDevices(tx);
      const visible = rows.filter(
        (row) => ctx.allBranches || ctx.branchIds.includes(row.device.branchId),
      );
      return { items: visible.map((row) => toListItem(row.device, row.branchName)) };
    });
  }

  async create(ctx: RequestContext, body: CreatePosDeviceBody): Promise<CreatePosDeviceResponse> {
    if (!ctx.allBranches && !ctx.branchIds.includes(body.branchId)) {
      throw new ForbiddenError('No access to this branch');
    }
    const now = this.clock.now();
    // A code collision is astronomically unlikely, but the unique index would reject it: retry once.
    for (let attempt = 0; ; attempt += 1) {
      const code = generatePairingCode();
      try {
        return await withOrg(this.db, ctx.orgId, async (tx) => {
          const branch = await this.repo.findBranchById(tx, body.branchId);
          if (!branch || branch.orgId !== ctx.orgId || !branch.isActive) {
            throw new NotFoundError();
          }
          const device = await this.repo.insertPosDevice(tx, {
            id: newUuidV7(),
            orgId: ctx.orgId,
            branchId: body.branchId,
            name: body.name,
            status: 'pending',
            pairingCodeHash: hashInviteToken(code),
            pairingExpiresAt: new Date(now.getTime() + PAIRING_CODE_TTL_MS),
            createdBy: ctx.membershipId,
          });
          return { device: toListItem(device, branch.name), pairingCode: code };
        });
      } catch (error) {
        if (attempt === 0 && isPgUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }
  }

  revoke(ctx: RequestContext, deviceId: string): Promise<void> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const device = await this.repo.findPosDeviceById(tx, deviceId);
      if (!device || device.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      if (!ctx.allBranches && !ctx.branchIds.includes(device.branchId)) {
        throw new ForbiddenError('No access to this branch');
      }
      await this.repo.revokePosDevice(tx, deviceId, this.clock.now());
    });
  }
}
