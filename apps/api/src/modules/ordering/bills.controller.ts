import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { ValidationError } from '../../core/errors/app-errors';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequireFeature } from '../../core/permissions/require-feature.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { BillListQueryDto, CreateBillPaymentBodyDto } from './dto/ordering.dto';
import { BillsService } from './bills.service';

/** Table bills: the open tab of a table, paid in full, in parts or per guest. */
@RequireBranchScope()
@Controller('v1/branches/:branchId/bills')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @RequirePermission('orders.read')
  @Get()
  list(
    @Ctx() ctx: RequestContext,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query() query: BillListQueryDto,
  ) {
    return this.bills.listBills(ctx, branchId, query);
  }

  @RequirePermission('orders.read')
  @Get(':billId')
  get(
    @Ctx() ctx: RequestContext,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('billId', ParseUUIDPipe) billId: string,
  ) {
    return this.bills.getBill(ctx, branchId, billId);
  }

  @RequirePermission('orders.create')
  @RequireFeature('pos.access')
  @Post(':billId/payments')
  async pay(
    @Ctx() ctx: RequestContext,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateBillPaymentBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey || idempotencyKey !== body.clientPaymentId) {
      throw new ValidationError('Idempotency-Key must equal clientPaymentId');
    }
    const result = await this.bills.payBill(ctx, branchId, billId, body);
    res.status(result.created ? 201 : 200);
    return result;
  }

  @RequirePermission('orders.create')
  @RequireFeature('pos.access')
  @HttpCode(200)
  @Post(':billId/close')
  close(
    @Ctx() ctx: RequestContext,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('billId', ParseUUIDPipe) billId: string,
  ) {
    return this.bills.closeBill(ctx, branchId, billId);
  }
}
