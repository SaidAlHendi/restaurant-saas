import { Module, forwardRef } from '@nestjs/common';

import { CoreModule } from '../../core/core.module';
import { BillingModule } from '../billing/billing.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { OrdersController } from './orders.controller';
import { OrderingRepository } from './ordering.repository';
import { OrderingService } from './ordering.service';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [
    CoreModule,
    CatalogModule,
    TenancyModule,
    forwardRef(() => BillingModule),
    forwardRef(() => IdentityModule),
  ],
  controllers: [TablesController, OrdersController],
  providers: [OrderingRepository, OrderingService, TablesService],
  exports: [OrderingService],
})
export class OrderingModule {}
