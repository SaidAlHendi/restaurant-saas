import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { AdminOrgIdParamDto, AdminOrgListQueryDto } from './admin-orgs.dto';
import { AdminOrgsService } from './admin-orgs.service';

/** Read-only for every admin role; suspend/reactivate (Step 12e) will add role-gated mutations. */
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
}
