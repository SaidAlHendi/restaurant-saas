import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATA_CHANGED_EVENT, type DataChangedPayload, type DataChangedScope } from '@app/shared';

import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { branches } from '../db/schema/tenancy';
import { withOrg } from '../db/with-org';
import { OutboxService } from '../outbox/outbox.service';

/** Records one `data.changed` outbox event per active branch; the outbox publisher pushes it to the branch rooms. */
@Injectable()
export class DataChangedNotifier {
  private readonly logger = new Logger(DataChangedNotifier.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly outbox: OutboxService,
  ) {}

  /** Best effort: the change is already committed, and screens also refetch when they reconnect. */
  async notify(orgId: string, scope: DataChangedScope): Promise<void> {
    try {
      await withOrg(this.db, orgId, async (tx) => {
        const rows = await tx
          .select({ id: branches.id })
          .from(branches)
          .where(and(eq(branches.orgId, orgId), eq(branches.isActive, true)));
        const version = Date.now();
        for (const { id: branchId } of rows) {
          const payload: DataChangedPayload = { scope, branchId, version };
          await this.outbox.write(tx, { orgId, branchId, type: DATA_CHANGED_EVENT, aggregateId: orgId, payload });
        }
      });
    } catch (err: unknown) {
      this.logger.error({ err, orgId, scope }, 'Failed to record data.changed events');
    }
  }
}
