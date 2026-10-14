import { Module } from '@nestjs/common';

import { ClockModule } from '../../core/clock/clock.module';
import { DbModule } from '../../core/db/db.module';

import { BillingRepository } from './billing.repository';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [DbModule, ClockModule],
  providers: [BillingRepository, EntitlementsService, SubscriptionService],
  exports: [EntitlementsService, SubscriptionService, BillingRepository],
})
export class BillingModule {}
