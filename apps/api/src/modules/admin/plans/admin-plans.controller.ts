import { Controller, Get, UseGuards, Query } from '@nestjs/common';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminPlansService } from './admin-plans.service';
import { PageQueryDto } from '../../../core/validation/page-query.dto';

/** Read-only in v1: plans are managed by migrations and seeds. */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/plans')
export class AdminPlansController {
  constructor(private readonly plans: AdminPlansService) {}

  @Get()
  @RequireAdminRole('billing')
  list(@Query() query: PageQueryDto) {
    return this.plans.list(query);
  }
}
