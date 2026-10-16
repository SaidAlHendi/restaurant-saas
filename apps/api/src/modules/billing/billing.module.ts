import { Module, forwardRef } from '@nestjs/common';

import { ConfigModule, ENV, type Env } from '../../config/config.module';
import { ClockModule } from '../../core/clock/clock.module';
import { DbModule } from '../../core/db/db.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { DisabledPaddleClient } from './disabled-paddle-client';
import { EntitlementsService } from './entitlements.service';
import { HttpPaddleClient } from './http-paddle-client';
import { PADDLE_CLIENT } from './paddle.tokens';
import { PaddleWebhookService } from './paddle-webhook.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    ClockModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => IdentityModule),
  ],
  controllers: [BillingController],
  providers: [
    BillingRepository,
    EntitlementsService,
    SubscriptionService,
    BillingService,
    PaddleWebhookService,
    {
      provide: PADDLE_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.PADDLE_API_KEY !== undefined ? new HttpPaddleClient(env) : new DisabledPaddleClient(),
    },
  ],
  exports: [BillingService, EntitlementsService, SubscriptionService],
})
export class BillingModule {}
