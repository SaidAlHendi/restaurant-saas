import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { AdminCtx, type AdminContext } from '../admin-context';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminOrgIdParamDto, AdminOrgListQueryDto } from './admin-orgs.dto';
import { AdminOrgsService } from './admin-orgs.service';

/** Reads are open to every admin role; suspend and reactivate need the `super` role and are audited. */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/orgs')
export class AdminOrgsController {
  constructor(private readonly orgs: AdminOrgsService) {}

  @Get()
  list(@Query() query: AdminOrgListQueryDto) {
    return this.orgs.list(query);
  }

  @Get(':id')
  get(@Param() params: AdminOrgIdParamDto) {
    return this.orgs.get(params.id);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @RequireAdminRole('super')
  suspend(@Param() params: AdminOrgIdParamDto, @AdminCtx() admin: AdminContext) {
    return this.orgs.suspend(params.id, admin);
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @RequireAdminRole('super')
  reactivate(@Param() params: AdminOrgIdParamDto, @AdminCtx() admin: AdminContext) {
    return this.orgs.reactivate(params.id, admin);
  }
}
