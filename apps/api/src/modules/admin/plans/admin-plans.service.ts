import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { slicePage, type AdminPlanListResponse, type PageQuery } from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { planFeatures, plans } from '../../../core/db/schema/billing';

@Injectable()
export class AdminPlansService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async list(query: PageQuery = {}): Promise<AdminPlanListResponse> {
    const planRows = await this.db.select().from(plans).orderBy(asc(plans.sortOrder));
    const featureRows = await this.db
      .select()
      .from(planFeatures)
      .orderBy(asc(planFeatures.featureKey));
    return slicePage(
      planRows.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        priceMinor: p.priceMinor,
        currency: p.currency,
        interval: p.interval,
        perBranch: p.perBranch,
        isPublic: p.isPublic,
        features: featureRows
          .filter((f) => f.planId === p.id)
          .map((f) => ({ key: f.featureKey, limit: f.limitValue })),
      })),
      query,
    );
  }
}
