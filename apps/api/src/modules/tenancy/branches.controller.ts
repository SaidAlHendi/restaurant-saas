import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { RequirePermission } from '../../core/permissions/require-permission.decorator';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { CreateBranchBodyDto, PatchBranchBodyDto } from './dto/branch.dto';
import { BranchesService } from './branches.service';

@Controller('v1/branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @RequirePermission('branches.read')
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.branches.list(ctx);
  }

  @RequirePermission('branches.manage')
  @Post()
  create(@Ctx() ctx: RequestContext, @Body() body: CreateBranchBodyDto) {
    return this.branches.create(ctx, body);
  }

  @RequirePermission('branches.manage')
  @Patch(':branchId')
  patch(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Body() body: PatchBranchBodyDto,
  ) {
    return this.branches.patch(ctx, branchId, body);
  }
}
