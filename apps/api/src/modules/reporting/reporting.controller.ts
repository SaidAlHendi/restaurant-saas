import { Controller, Get, Param, Query } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequireBranchScope } from '../../core/permissions/require-branch-scope.decorator';
import { RequireFeature } from '../../core/permissions/require-feature.decorator';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { DailyReportQueryDto } from './dto/reporting.dto';
import { ReportingService } from './reporting.service';

@RequireBranchScope()
@Controller('v1/branches/:branchId/reports')
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @RequirePermission('reports.read')
  @RequireFeature('reports.basic')
  @Get('daily')
  getDaily(
    @Ctx() ctx: RequestContext,
    @Param('branchId') branchId: string,
    @Query() query: DailyReportQueryDto,
  ) {
    return this.reporting.getDailyReport(ctx, branchId, query);
  }
}
