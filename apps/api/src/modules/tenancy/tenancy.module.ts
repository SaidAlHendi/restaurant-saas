import { Module, forwardRef } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { PublicMenuModule } from '../public-menu/public-menu.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { OrgLogoService } from './org-logo.service';
import { OrgSettingsController } from './org-settings.controller';
import { OrgSettingsService } from './org-settings.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { TenancyRepository } from './tenancy.repository';

@Module({
  imports: [forwardRef(() => IdentityModule), PublicMenuModule, NotificationsModule],
  controllers: [
    BranchesController,
    MembershipsController,
    OrgSettingsController,
    StaffController,
  ],
  providers: [
    TenancyRepository,
    BranchesService,
    MembershipsService,
    OrgSettingsService,
    OrgLogoService,
    StaffService,
  ],
  exports: [TenancyRepository, OrgSettingsService],
})
export class TenancyModule {}
