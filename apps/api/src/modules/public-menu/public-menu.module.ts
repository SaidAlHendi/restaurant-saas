import { Module } from '@nestjs/common';

import { MENU_CACHE_PURGER } from '../../core/cache/menu-cache-purger';
import { NoopMenuCachePurger } from '../../core/cache/noop-menu-cache-purger';
import { BillingModule } from '../billing/billing.module';

import { PublicMenuController } from './public-menu.controller';
import { PublicMenuRepository } from './public-menu.repository';
import { PublicMenuService } from './public-menu.service';

@Module({
  imports: [BillingModule],
  controllers: [PublicMenuController],
  providers: [
    PublicMenuRepository,
    PublicMenuService,
    NoopMenuCachePurger,
    { provide: MENU_CACHE_PURGER, useExisting: NoopMenuCachePurger },
  ],
  exports: [MENU_CACHE_PURGER, NoopMenuCachePurger],
})
export class PublicMenuModule {}
