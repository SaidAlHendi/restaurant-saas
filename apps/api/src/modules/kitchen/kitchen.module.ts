import { Module, forwardRef } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { OrderingModule } from '../ordering/ordering.module';

import { KitchenController } from './kitchen.controller';
import { KitchenItemStatusController } from './kitchen-item-status.controller';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [OrderingModule, forwardRef(() => BillingModule)],
  controllers: [KitchenController, KitchenItemStatusController],
  providers: [KitchenService],
})
export class KitchenModule {}
