import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { CreatePosDeviceBodyDto } from './dto/devices.dto';
import { DevicesService } from './devices.service';

@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @RequirePermission('staff.manage')
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.devices.list(ctx);
  }

  @RequirePermission('staff.manage')
  @Post()
  create(@Ctx() ctx: RequestContext, @Body() body: CreatePosDeviceBodyDto) {
    return this.devices.create(ctx, body);
  }

  @RequirePermission('staff.manage')
  @HttpCode(204)
  @Delete(':deviceId')
  async revoke(@Ctx() ctx: RequestContext, @Param('deviceId') deviceId: string) {
    await this.devices.revoke(ctx, deviceId);
  }
}
