import { Controller, Get, Query } from '@nestjs/common';

import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { MembershipsService } from './memberships.service';
import { PageQueryDto } from '../../core/validation/page-query.dto';

@Controller('v1/memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @RequirePermission('staff.read')
  @Get()
  list(@Ctx() ctx: RequestContext, @Query() query: PageQueryDto) {
    return this.memberships.list(ctx, query);
  }
}
