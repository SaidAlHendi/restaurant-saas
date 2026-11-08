import { adminSubscriptionListQuerySchema } from '@app/shared';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';

import { Public } from '../../../core/auth/public.decorator';
import { AdminAuthGuard } from '../admin-auth.guard';
import { RequireAdminRole } from '../require-admin-role.decorator';
import { AdminSubscriptionsService } from './admin-subscriptions.service';

class AdminSubscriptionListQueryDto extends createZodDto(adminSubscriptionListQuerySchema) {}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: AdminSubscriptionsService) {}

  @Get()
  @RequireAdminRole('billing')
  list(@Query() query: AdminSubscriptionListQueryDto) {
    return this.subscriptions.list(query);
  }
}
