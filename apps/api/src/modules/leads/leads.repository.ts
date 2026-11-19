import { Inject, Injectable } from '@nestjs/common';

import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { leads } from '../../core/db/schema/leads';

export type NewLeadRow = typeof leads.$inferInsert;

@Injectable()
export class LeadsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** The API role may only insert leads (no SELECT), so nothing is read back: the id comes from the app. */
  async insert(row: NewLeadRow): Promise<void> {
    await this.db.insert(leads).values(row);
  }
}
