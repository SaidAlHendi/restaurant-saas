import { Inject, Injectable, Logger } from '@nestjs/common';

import { MENU_CACHE_PURGER, type MenuCachePurger } from '../../core/cache/menu-cache-purger';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { scheduleMenuCachePurge } from '../public-menu/public-menu-cache.util';
import { TenancyRepository } from '../tenancy/tenancy.repository';

@Injectable()
export class CatalogMenuCacheNotifier {
  private readonly logger = new Logger(CatalogMenuCacheNotifier.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(MENU_CACHE_PURGER) private readonly purger: MenuCachePurger,
    private readonly tenancyRepo: TenancyRepository,
  ) {}

  afterCatalogChange(orgId: string): void {
    scheduleMenuCachePurge(this.db, this.tenancyRepo, this.purger, orgId, this.logger);
  }
}
