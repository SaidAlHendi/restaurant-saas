import type { Logger } from '@nestjs/common';

import type { MenuCachePurger } from '../../core/cache/menu-cache-purger';
import type { DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { TenancyRepository } from '../tenancy/tenancy.repository';

/** Purges the org's public menu from the CDN and waits for it; failures are logged, never thrown. */
export async function purgeMenuCacheNow(
  db: DrizzleDb,
  tenancyRepo: TenancyRepository,
  purger: MenuCachePurger,
  orgId: string,
  logger: Logger,
): Promise<void> {
  try {
    await withOrg(db, orgId, async (tx) => {
      const org = await tenancyRepo.findOrganizationById(tx, orgId);
      if (!org) {
        return;
      }
      await purger.purgeOrg(org.slug);
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn(`Menu cache purge failed for org ${orgId}: ${message}`);
  }
}

export function scheduleMenuCachePurge(
  db: DrizzleDb,
  tenancyRepo: TenancyRepository,
  purger: MenuCachePurger,
  orgId: string,
  logger: Logger,
): void {
  void purgeMenuCacheNow(db, tenancyRepo, purger, orgId, logger);
}
