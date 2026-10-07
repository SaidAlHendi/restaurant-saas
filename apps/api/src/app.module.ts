import { Module } from '@nestjs/common';

import { CoreModule } from './core/core.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/billing/billing.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrderingModule } from './modules/ordering/ordering.module';
import { PublicMenuModule } from './modules/public-menu/public-menu.module';
import { ReportingModule } from './modules/reporting/reporting.module';
@Module({
  imports: [
    CoreModule,
    HealthModule,
    MediaModule,
    CatalogModule,
    OrderingModule,
    KitchenModule,
    ReportingModule,
    BillingModule,
    NotificationsModule,
    AdminModule,
    PublicMenuModule,
  ],
})
export class AppModule {}
