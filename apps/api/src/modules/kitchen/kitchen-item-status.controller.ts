import { Body, Controller, Param, Post } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequireFeature } from '../../core/permissions/require-feature.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { OrderingPathIdPipe } from '../ordering/pipes/ordering-path-id.pipe';

import { ChangeOrderItemStatusBodyDto } from './dto/kitchen.dto';
import { KitchenService } from './kitchen.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/orders')
export class KitchenItemStatusController {
  constructor(private readonly kitchen: KitchenService) {}

  @RequirePermission('orders.update_status')
  @RequireFeature('kds.access')
  @Post(':orderId/items/:itemId/status')
  changeItemStatus(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId', OrderingPathIdPipe) orderId: string,
    @Param('itemId', OrderingPathIdPipe) itemId: string,
    @Body() body: ChangeOrderItemStatusBodyDto,
  ) {
    return this.kitchen.changeItemStatus(ctx, branchId, orderId, itemId, body);
  }
}
