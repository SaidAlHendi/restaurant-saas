import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { ValidationError } from '../../core/errors/app-errors';
import { Authenticated } from '../../core/auth/authenticated.decorator';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import {
  AddOrderItemsBodyDto,
  ChangeOrderStatusBodyDto,
  CreateOrderBodyDto,
  OrderListQueryDto,
  VoidOrderItemBodyDto,
} from './dto/ordering.dto';
import { OrderingService } from './ordering.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/orders')
export class OrdersController {
  constructor(private readonly ordering: OrderingService) {}

  @RequirePermission('orders.create')
  @Post()
  async create(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateOrderBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey || idempotencyKey !== body.clientOrderId) {
      throw new ValidationError('Idempotency-Key must equal clientOrderId');
    }
    const result = await this.ordering.createOrder(ctx, branchId, body);
    res.status(result.created ? 201 : 200);
    return result.order;
  }

  @RequirePermission('orders.read')
  @Get()
  list(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Query() query: OrderListQueryDto,
  ) {
    return this.ordering.listOrders(ctx, branchId, query);
  }

  @RequirePermission('orders.read')
  @Get(':orderId/events')
  listEvents(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordering.listEvents(ctx, branchId, orderId);
  }

  @RequirePermission('orders.read')
  @Get(':orderId')
  get(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordering.getOrder(ctx, branchId, orderId);
  }

  @Authenticated()
  @Post(':orderId/status')
  changeStatus(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId') orderId: string,
    @Body() body: ChangeOrderStatusBodyDto,
  ) {
    return this.ordering.changeStatus(ctx, branchId, orderId, body);
  }

  @RequirePermission('orders.create')
  @Post(':orderId/items')
  addItems(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId') orderId: string,
    @Body() body: AddOrderItemsBodyDto,
  ) {
    return this.ordering.addItems(ctx, branchId, orderId, body);
  }

  @Authenticated()
  @Post(':orderId/items/:itemId/void')
  voidItem(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: VoidOrderItemBodyDto,
  ) {
    return this.ordering.voidItem(ctx, branchId, orderId, itemId, body);
  }

}
