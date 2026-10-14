import { Module, forwardRef } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { PublicMenuModule } from '../public-menu/public-menu.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { CatalogRepository } from './catalog.repository';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ModifierGroupsController } from './modifier-groups.controller';
import { ModifierGroupsService } from './modifier-groups.service';
import { ProductImageService } from './product-image.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CatalogOrderingService } from './catalog-ordering.service';
import { CatalogMenuCacheNotifier } from './catalog-menu-cache.notifier';
import { PosMenuController } from './pos-menu.controller';
import { PosMenuService } from './pos-menu.service';

@Module({
  imports: [TenancyModule, forwardRef(() => BillingModule), PublicMenuModule],
  controllers: [CategoriesController, ProductsController, ModifierGroupsController, PosMenuController],
  providers: [
    CatalogRepository,
    CategoriesService,
    ProductsService,
    ModifierGroupsService,
    ProductImageService,
    CatalogOrderingService,
    CatalogMenuCacheNotifier,
    PosMenuService,
  ],
  exports: [ProductsService, CategoriesService, CatalogOrderingService],
})
export class CatalogModule {}
