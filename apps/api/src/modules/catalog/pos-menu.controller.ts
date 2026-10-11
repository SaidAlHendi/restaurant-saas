import { Controller, Get, Param } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequireFeature } from '../../core/permissions/require-feature.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { PosMenuService } from './pos-menu.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/pos')
export class PosMenuController {
  constructor(private readonly posMenu: PosMenuService) {}

  @RequirePermission('orders.create')
  @RequireFeature('pos.access')
  @Get('menu')
  getMenu(@Ctx() ctx: RequestContext, @Param('branchId') branchId: string) {
    return this.posMenu.getMenu(ctx, branchId);
  }
}
