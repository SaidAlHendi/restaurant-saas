import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module';
import { AdminDbModule } from '../../core/db/admin-db.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminJwtService } from './admin-jwt.service';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminOrgsController } from './orgs/admin-orgs.controller';
import { AdminOrgsService } from './orgs/admin-orgs.service';
import { WithAdminService } from './with-admin.service';

@Module({
  imports: [AuthModule, AdminDbModule],
  controllers: [AdminAuthController, AdminOrgsController],
  providers: [AdminJwtService, AdminAuthService, AdminOrgsService, AdminAuthGuard, WithAdminService],
  exports: [AdminDbModule, AdminAuthGuard, AdminJwtService, WithAdminService],
})
export class AdminModule {}
