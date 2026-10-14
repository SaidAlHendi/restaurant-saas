import { Module, forwardRef } from '@nestjs/common';

import { ConfigModule, ENV, type Env } from '../../config/config.module';
import { MENU_CACHE_PURGER } from '../../core/cache/menu-cache-purger';
import { NoopMenuCachePurger } from '../../core/cache/noop-menu-cache-purger';
import { ClockModule } from '../../core/clock/clock.module';
import { DbModule } from '../../core/db/db.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { FakePaddleClient } from './fake-paddle-client';
import { HttpPaddleClient } from './http-paddle-client';
import { PADDLE_CLIENT } from './paddle.tokens';
import { PaddleWebhookService } from './paddle-webhook.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [ConfigModule, DbModule, ClockModule, forwardRef(() => TenancyModule)],
  controllers: [BillingController],
  providers: [
    BillingRepository,
    EntitlementsService,
    SubscriptionService,
    BillingService,
    PaddleWebhookService,
    HttpPaddleClient,
    FakePaddleClient,
    NoopMenuCachePurger,
    { provide: MENU_CACHE_PURGER, useExisting: NoopMenuCachePurger },
    {
      provide: PADDLE_CLIENT,
      inject: [ENV, HttpPaddleClient, FakePaddleClient],
      useFactory: (env: Env, http: HttpPaddleClient, fake: FakePaddleClient) => {
        if (env.PADDLE_API_KEY !== undefined) {
          return http;
        }
        return fake;
      },
    },
  ],
  exports: [EntitlementsService, SubscriptionService, BillingRepository, PADDLE_CLIENT],
})
export class BillingModule {}
