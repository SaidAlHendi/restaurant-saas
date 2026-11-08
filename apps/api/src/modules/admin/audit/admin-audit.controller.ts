import { adminAuditListQuerySchema } from '@app/shared';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminAuditService } from './admin-audit.service';

class AdminAuditListQueryDto extends createZodDto(adminAuditListQuerySchema) {}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/audit')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get()
  @RequireAdminRole('super')
  list(@Query() query: AdminAuditListQueryDto) {
    return this.audit.list(query);
  }
}
