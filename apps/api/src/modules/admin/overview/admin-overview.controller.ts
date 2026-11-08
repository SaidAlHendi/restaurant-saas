import { Controller, Get, UseGuards } from '@nestjs/common';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminOverviewService } from './admin-overview.service';

/** Read-only platform KPIs, open to every admin role (support is the lowest). */
@Public()
@UseGuards(AdminAuthGuard)
@RequireAdminRole('support')
@Controller('v1/admin/overview')
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  get() {
    return this.overview.get();
  }
}
