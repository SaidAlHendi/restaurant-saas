import { Module, forwardRef } from '@nestjs/common';

import { CoreModule } from '../../core/core.module';
import { BillingModule } from '../billing/billing.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { ReportingController } from './reporting.controller';
import { ReportingRepository } from './reporting.repository';
import { ReportingService } from './reporting.service';

@Module({
  imports: [CoreModule, TenancyModule, forwardRef(() => BillingModule)],
  controllers: [ReportingController],
  providers: [ReportingRepository, ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
