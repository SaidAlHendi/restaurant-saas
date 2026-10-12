import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';

import { Authenticated } from '../../core/auth/authenticated.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';

import {
  CreatePinOnlyStaffBodyDto,
  CreateStaffInviteBodyDto,
  PatchStaffMembershipBodyDto,
  PutStaffPinBodyDto,
} from './dto/staff.dto';
import { StaffService } from './staff.service';

@Controller('v1/staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @RequirePermission('staff.read')
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.staff.list(ctx);
  }

  @RequirePermission('staff.manage')
  @Post('invites')
  createInvite(@Ctx() ctx: RequestContext, @Body() body: CreateStaffInviteBodyDto) {
    return this.staff.createInvite(ctx, body);
  }

  @RequirePermission('staff.manage')
  @Post('pin-only')
  createPinOnly(@Ctx() ctx: RequestContext, @Body() body: CreatePinOnlyStaffBodyDto) {
    return this.staff.createPinOnly(ctx, body);
  }

  @RequirePermission('staff.manage')
  @Post(':membershipId/invite/regenerate')
  regenerateInvite(@Ctx() ctx: RequestContext, @Param('membershipId') membershipId: string) {
    return this.staff.regenerateInvite(ctx, membershipId);
  }

  @RequirePermission('staff.manage')
  @Delete(':membershipId/invite')
  revokeInvite(@Ctx() ctx: RequestContext, @Param('membershipId') membershipId: string) {
    return this.staff.revokeInvite(ctx, membershipId);
  }

  @RequirePermission('staff.manage')
  @Patch(':membershipId')
  patchMembership(
    @Ctx() ctx: RequestContext,
    @Param('membershipId') membershipId: string,
    @Body() body: PatchStaffMembershipBodyDto,
  ) {
    return this.staff.patchMembership(ctx, membershipId, body);
  }

  @Authenticated()
  @Put(':membershipId/pin')
  putPin(
    @Ctx() ctx: RequestContext,
    @Param('membershipId') membershipId: string,
    @Body() body: PutStaffPinBodyDto,
  ) {
    return this.staff.putPin(ctx, membershipId, body);
  }

  @Authenticated()
  @Delete(':membershipId/pin')
  deletePin(@Ctx() ctx: RequestContext, @Param('membershipId') membershipId: string) {
    return this.staff.deletePin(ctx, membershipId);
  }
}
