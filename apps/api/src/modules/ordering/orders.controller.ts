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

import { RequireFeature } from '../../core/permissions/require-feature.decorator';

import {
  AddOrderItemsBodyDto,
  ChangeOrderStatusBodyDto,
  CreateOrderBodyDto,
  CreatePaymentBodyDto,
  OrderListQueryDto,
  VoidOrderItemBodyDto,
} from './dto/ordering.dto';
import { OrderingPathIdPipe } from './pipes/ordering-path-id.pipe';
import { OrderingService } from './ordering.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/orders')
export class OrdersController {
  constructor(private readonly ordering: OrderingService) {}

  @RequirePermission('orders.create')
  @RequireFeature('pos.access')
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
    @Param('orderId', OrderingPathIdPipe) orderId: string,
  ) {
    return this.ordering.listEvents(ctx, branchId, orderId);
  }

  @RequirePermission('orders.read')
  @Get(':orderId')
  get(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId', OrderingPathIdPipe) orderId: string,
  ) {
    return this.ordering.getOrder(ctx, branchId, orderId);
  }

  // Not plan-gated on purpose: after a downgrade, orders already taken can still be finished or
  // cancelled ("only new creates are blocked", docs/product.md). Permissions are checked per
  // transition in the service.
  @Authenticated()
  @Post(':orderId/status')
  changeStatus(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId', OrderingPathIdPipe) orderId: string,
    @Body() body: ChangeOrderStatusBodyDto,
  ) {
    return this.ordering.changeStatus(ctx, branchId, orderId, body);
  }

  @RequirePermission('orders.create')
  @RequireFeature('pos.access')
  @Post(':orderId/items')
  addItems(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId', OrderingPathIdPipe) orderId: string,
    @Body() body: AddOrderItemsBodyDto,
  ) {
    return this.ordering.addItems(ctx, branchId, orderId, body);
  }

  @RequirePermission('orders.create')
  @RequireFeature('pos.access')
  @Post(':orderId/payments')
  async capturePayment(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId', OrderingPathIdPipe) orderId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreatePaymentBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey || idempotencyKey !== body.clientPaymentId) {
      throw new ValidationError('Idempotency-Key must equal clientPaymentId');
    }
    const result = await this.ordering.capturePayment(ctx, branchId, orderId, body);
    res.status(result.created ? 201 : 200);
    return result.payment;
  }

  @Authenticated()
  @Post(':orderId/items/:itemId/void')
  voidItem(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('orderId', OrderingPathIdPipe) orderId: string,
    @Param('itemId', OrderingPathIdPipe) itemId: string,
    @Body() body: VoidOrderItemBodyDto,
  ) {
    return this.ordering.voidItem(ctx, branchId, orderId, itemId, body);
  }

}
