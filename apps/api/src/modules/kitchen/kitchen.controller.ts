import { Controller, Get, Param } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequireFeature } from '../../core/permissions/require-feature.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { KitchenService } from './kitchen.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/kitchen')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @RequirePermission('orders.read')
  @RequireFeature('kds.access')
  @Get('board')
  getBoard(@Ctx() ctx: RequestContext, @Param('branchId') branchId: string) {
    return this.kitchen.getBoard(ctx, branchId);
  }
}
