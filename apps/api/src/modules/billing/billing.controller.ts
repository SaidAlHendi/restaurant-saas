import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../core/auth/public.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { UnauthorizedError } from '../../core/errors/app-errors';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { BillingService } from './billing.service';
import { BillingChangePlanBodyDto, BillingCheckoutBodyDto } from './dto/billing.dto';
import { PaddleWebhookService } from './paddle-webhook.service';

@Controller('v1/billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly webhooks: PaddleWebhookService,
  ) {}

  @RequirePermission('billing.manage')
  @Get()
  getOverview(@Ctx() ctx: RequestContext) {
    return this.billing.getOverview(ctx);
  }

  @RequirePermission('billing.manage')
  @Post('checkout')
  checkout(@Ctx() ctx: RequestContext, @Body() body: BillingCheckoutBodyDto) {
    return this.billing.checkout(ctx, body);
  }

  @RequirePermission('billing.manage')
  @Post('change-plan')
  changePlan(@Ctx() ctx: RequestContext, @Body() body: BillingChangePlanBodyDto) {
    return this.billing.changePlan(ctx, body);
  }

  @RequirePermission('billing.manage')
  @Post('portal')
  portal(@Ctx() ctx: RequestContext) {
    return this.billing.portal(ctx);
  }

  @Public()
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @HttpCode(200)
  @Post('webhooks/paddle')
  async paddleWebhook(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody;
    if (raw === undefined) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Missing raw body');
    }
    const header = req.header('paddle-signature') ?? undefined;
    await this.webhooks.handleWebhook(raw, header);
    return { ok: true };
  }
}
