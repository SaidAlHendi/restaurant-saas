import { Module } from '@nestjs/common';

import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { OrgSettingsService } from './org-settings.service';
import { TenancyRepository } from './tenancy.repository';

@Module({
  controllers: [BranchesController, MembershipsController],
  providers: [TenancyRepository, BranchesService, MembershipsService, OrgSettingsService],
  exports: [TenancyRepository, OrgSettingsService],
})
export class TenancyModule {}
