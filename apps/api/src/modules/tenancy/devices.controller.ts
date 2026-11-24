import { Body, Controller, Delete, Get, HttpCode, Param, Post, ParseUUIDPipe, Query } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { CreatePosDeviceBodyDto } from './dto/devices.dto';
import { DevicesService } from './devices.service';
import { PageQueryDto } from '../../core/validation/page-query.dto';
import { NotifyChange } from '../../core/realtime/notify-change.decorator';

@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @RequirePermission('staff.manage')
  @Get()
  list(@Ctx() ctx: RequestContext, @Query() query: PageQueryDto) {
    return this.devices.list(ctx, query);
  }

  @RequirePermission('staff.manage')
  @NotifyChange('devices')
  @Post()
  create(@Ctx() ctx: RequestContext, @Body() body: CreatePosDeviceBodyDto) {
    return this.devices.create(ctx, body);
  }

  @RequirePermission('staff.manage')
  @HttpCode(204)
  @NotifyChange('devices')
  @Delete(':deviceId')
  async revoke(@Ctx() ctx: RequestContext, @Param('deviceId', ParseUUIDPipe) deviceId: string) {
    await this.devices.revoke(ctx, deviceId);
  }
}
