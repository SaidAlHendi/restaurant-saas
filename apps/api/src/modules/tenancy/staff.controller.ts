import { Body, Controller, Delete, Get, Param, Patch, Post, Put, ParseUUIDPipe, Query } from '@nestjs/common';

import { Authenticated } from '../../core/auth/authenticated.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';

import {
  CreatePinOnlyStaffBodyDto,
  CreateStaffInviteBodyDto,
  PatchStaffMembershipBodyDto,
  PutStaffPermissionOverridesBodyDto,
  PutStaffPinBodyDto,
} from './dto/staff.dto';
import { StaffService } from './staff.service';
import { PageQueryDto } from '../../core/validation/page-query.dto';
import { NotifyChange } from '../../core/realtime/notify-change.decorator';

@Controller('v1/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @RequirePermission('staff.read')
  @Get()
  list(@Ctx() ctx: RequestContext, @Query() query: PageQueryDto) {
    return this.staff.list(ctx, query);
  }

  @RequirePermission('staff.manage')
  @NotifyChange('staff')
  @Post('invites')
  createInvite(@Ctx() ctx: RequestContext, @Body() body: CreateStaffInviteBodyDto) {
    return this.staff.createInvite(ctx, body);
  }

  @RequirePermission('staff.manage')
  @NotifyChange('staff')
  @Post('pin-only')
  createPinOnly(@Ctx() ctx: RequestContext, @Body() body: CreatePinOnlyStaffBodyDto) {
    return this.staff.createPinOnly(ctx, body);
  }

  @RequirePermission('staff.manage')
  @NotifyChange('staff')
  @Post(':membershipId/invite/regenerate')
  regenerateInvite(@Ctx() ctx: RequestContext, @Param('membershipId', ParseUUIDPipe) membershipId: string) {
    return this.staff.regenerateInvite(ctx, membershipId);
  }

  @RequirePermission('staff.manage')
  @NotifyChange('staff')
  @Delete(':membershipId/invite')
  revokeInvite(@Ctx() ctx: RequestContext, @Param('membershipId', ParseUUIDPipe) membershipId: string) {
    return this.staff.revokeInvite(ctx, membershipId);
  }

  @RequirePermission('staff.manage')
  @NotifyChange('staff')
  @Patch(':membershipId')
  patchMembership(
    @Ctx() ctx: RequestContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() body: PatchStaffMembershipBodyDto,
  ) {
    return this.staff.patchMembership(ctx, membershipId, body);
  }

  @RequirePermission('org.manage')
  @Get(':membershipId/permissions')
  getPermissions(@Ctx() ctx: RequestContext, @Param('membershipId', ParseUUIDPipe) membershipId: string) {
    return this.staff.getPermissionOverrides(ctx, membershipId);
  }

  @RequirePermission('org.manage')
  @NotifyChange('staff')
  @Put(':membershipId/permissions')
  putPermissions(
    @Ctx() ctx: RequestContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() body: PutStaffPermissionOverridesBodyDto,
  ) {
    return this.staff.putPermissionOverrides(ctx, membershipId, body);
  }

  @Authenticated()
  @NotifyChange('staff')
  @Put(':membershipId/pin')
  putPin(
    @Ctx() ctx: RequestContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() body: PutStaffPinBodyDto,
  ) {
    return this.staff.putPin(ctx, membershipId, body);
  }

  @Authenticated()
  @NotifyChange('staff')
  @Delete(':membershipId/pin')
  deletePin(@Ctx() ctx: RequestContext, @Param('membershipId', ParseUUIDPipe) membershipId: string) {
    return this.staff.deletePin(ctx, membershipId);
  }
}
