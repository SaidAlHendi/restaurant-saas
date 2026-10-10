import { Injectable } from '@nestjs/common';

import type { DrizzleTx } from '../db/with-org';
import { outboxEvents } from '../db/schema/infra';
import { newUuidV7 } from '../../lib/uuid';

export type OutboxWriteInput = {
  orgId: string;
  branchId: string | null;
  type: string;
  aggregateId: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class OutboxService {
  async write(tx: DrizzleTx, event: OutboxWriteInput): Promise<void> {
    await tx.insert(outboxEvents).values({
      id: newUuidV7(),
      orgId: event.orgId,
      branchId: event.branchId,
      type: event.type,
      aggregateId: event.aggregateId,
      payload: event.payload,
    });
  }
}
