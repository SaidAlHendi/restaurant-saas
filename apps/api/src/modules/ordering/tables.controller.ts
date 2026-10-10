import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { CreateDiningTableBodyDto, PatchDiningTableBodyDto } from './dto/ordering.dto';
import { OrderingPathIdPipe } from './pipes/ordering-path-id.pipe';
import { TablesService } from './tables.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @RequirePermission('branches.read')
  @Get()
  list(@Ctx() ctx: RequestContext, @Param('branchId') branchId: string) {
    const includeQrToken = ctx.permissions.includes('branches.manage');
    return this.tables.list(ctx, branchId, includeQrToken);
  }

  @RequirePermission('branches.manage')
  @Post()
  create(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Body() body: CreateDiningTableBodyDto,
  ) {
    return this.tables.create(ctx, branchId, body);
  }

  @RequirePermission('branches.manage')
  @Patch(':tableId')
  patch(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Param('tableId', OrderingPathIdPipe) tableId: string,
    @Body() body: PatchDiningTableBodyDto,
  ) {
    return this.tables.patch(ctx, branchId, tableId, body);
  }
}
