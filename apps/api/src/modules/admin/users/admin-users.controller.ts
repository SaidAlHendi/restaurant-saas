import { adminUserListQuerySchema } from '@app/shared';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminUsersService } from './admin-users.service';

class AdminUserListQueryDto extends createZodDto(adminUserListQuerySchema) {}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @RequireAdminRole('support')
  list(@Query() query: AdminUserListQueryDto) {
    return this.users.list(query);
  }
}
