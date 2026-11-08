import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module';
import { AdminDbModule } from '../../core/db/admin-db.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminJwtService } from './admin-jwt.service';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminOverviewController } from './overview/admin-overview.controller';
import { AdminOverviewService } from './overview/admin-overview.service';
import { AdminOrgsController } from './orgs/admin-orgs.controller';
import { AdminOrgsService } from './orgs/admin-orgs.service';
import { AdminAuditController } from './audit/admin-audit.controller';
import { AdminAuditService } from './audit/admin-audit.service';
import { AdminPlansController } from './plans/admin-plans.controller';
import { AdminPlansService } from './plans/admin-plans.service';
import { AdminSubscriptionsController } from './subscriptions/admin-subscriptions.controller';
import { AdminSubscriptionsService } from './subscriptions/admin-subscriptions.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { WithAdminService } from './with-admin.service';

@Module({
  imports: [AuthModule, AdminDbModule],
  controllers: [
    AdminAuthController,
    AdminOrgsController,
    AdminOverviewController,
    AdminUsersController,
    AdminSubscriptionsController,
    AdminPlansController,
    AdminAuditController,
  ],
  providers: [
    AdminJwtService,
    AdminAuthService,
    AdminOrgsService,
    AdminOverviewService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminPlansService,
    AdminAuditService,
    AdminAuthGuard,
    WithAdminService,
  ],
  exports: [AdminDbModule, AdminAuthGuard, AdminJwtService, WithAdminService],
})
export class AdminModule {}
