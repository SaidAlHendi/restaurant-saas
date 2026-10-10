import { Injectable } from '@nestjs/common';

import type { MenuCachePurger } from './menu-cache-purger';

/** TODO: Cloudflare CDN purge driver when staging CDN is wired. */
@Injectable()
export class NoopMenuCachePurger implements MenuCachePurger {
  async purgeOrg(_orgSlug: string): Promise<void> {
    await Promise.resolve();
  }
}
