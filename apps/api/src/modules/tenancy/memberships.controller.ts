import { Controller, Get } from '@nestjs/common';

import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { MembershipsService } from './memberships.service';

@Controller('v1/memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @RequirePermission('staff.read')
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.memberships.list(ctx);
  }
}
