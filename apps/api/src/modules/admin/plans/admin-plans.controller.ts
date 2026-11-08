import { Controller, Get, UseGuards } from '@nestjs/common';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminPlansService } from './admin-plans.service';

/** Read-only in v1: plans are managed by migrations and seeds. */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/plans')
export class AdminPlansController {
  constructor(private readonly plans: AdminPlansService) {}

  @Get()
  @RequireAdminRole('billing')
  list() {
    return this.plans.list();
  }
}
