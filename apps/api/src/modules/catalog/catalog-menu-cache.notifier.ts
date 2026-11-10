import { Inject, Injectable, Logger } from '@nestjs/common';
import { CATALOG_UPDATED_EVENT, type CatalogRealtimePayload } from '@app/shared';

import { MENU_CACHE_PURGER, type MenuCachePurger } from '../../core/cache/menu-cache-purger';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { OutboxService } from '../../core/outbox/outbox.service';
import { scheduleMenuCachePurge } from '../public-menu/public-menu-cache.util';
import { TenancyRepository } from '../tenancy/tenancy.repository';

/**
 * Single choke point after any catalog mutation: purges the public menu cache and records one
 * `catalog.updated` outbox event per active branch, so POS screens refetch their menu.
 */
@Injectable()
export class CatalogMenuCacheNotifier {
  private readonly logger = new Logger(CatalogMenuCacheNotifier.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(MENU_CACHE_PURGER) private readonly purger: MenuCachePurger,
    private readonly tenancyRepo: TenancyRepository,
    private readonly outbox: OutboxService,
  ) {}

  async afterCatalogChange(orgId: string): Promise<void> {
    scheduleMenuCachePurge(this.db, this.tenancyRepo, this.purger, orgId, this.logger);
    try {
      await this.recordBranchEvents(orgId);
    } catch (err: unknown) {
      // The catalog change is already committed; clients also refetch on reconnect.
      this.logger.error({ err, orgId }, 'Failed to record catalog.updated events');
    }
  }

  private async recordBranchEvents(orgId: string): Promise<void> {
    await withOrg(this.db, orgId, async (tx) => {
      const branchIds = await this.tenancyRepo.listActiveBranchIds(tx, orgId);
      const version = Date.now();
      for (const branchId of branchIds) {
        const payload: CatalogRealtimePayload = { branchId, version };
        await this.outbox.write(tx, {
          orgId,
          branchId,
          type: CATALOG_UPDATED_EVENT,
          aggregateId: orgId,
          payload,
        });
      }
    });
  }
}
