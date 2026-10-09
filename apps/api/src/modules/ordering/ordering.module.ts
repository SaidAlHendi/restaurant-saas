import { Module } from '@nestjs/common';

import { CoreModule } from '../../core/core.module';
import { CatalogModule } from '../catalog/catalog.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { OrderingRepository } from './ordering.repository';
import { OrderingService } from './ordering.service';

@Module({
  imports: [CoreModule, CatalogModule, TenancyModule],
  providers: [OrderingRepository, OrderingService],
  exports: [OrderingService],
})
export class OrderingModule {}
