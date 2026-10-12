import { Inject, Injectable } from '@nestjs/common';

import type { DailyReport, DailyReportQuery } from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { NotFoundError } from '../../core/errors/app-errors';
import { computeBusinessDate } from '../../lib/business-date';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import {
  averageTicketMinor,
  fillByPaymentMethod,
  fillByType,
  unpaidMinor,
} from './daily-report.utils';
import { ReportingRepository } from './reporting.repository';

@Injectable()
export class ReportingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly repo: ReportingRepository,
    private readonly tenancyRepo: TenancyRepository,
  ) {}

  async getDailyReport(
    ctx: RequestContext,
    branchId: string,
    query: DailyReportQuery,
  ): Promise<DailyReport> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch || branch.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      const businessDate =
        query.businessDate ??
        computeBusinessDate({
          now: this.clock.now(),
          timezone: branch.timezone,
          dayStartHour: branch.dayStartHour,
        });

      const rollup = await this.repo.loadOrderDayRollup(tx, branchId, businessDate);
      const byTypeRows = await this.repo.loadSalesByType(tx, branchId, businessDate);
      const paidMinor = await this.repo.loadPaidMinorOnCountedOrders(tx, branchId, businessDate);
      const byMethodRows = await this.repo.loadPaymentsByMethod(tx, branchId, businessDate);
      const topItems = await this.repo.loadTopItems(tx, branchId, businessDate);

      const salesMinor = rollup.salesMinor;
      const ordersCount = rollup.ordersCount;

      return {
        businessDate,
        timezone: branch.timezone,
        currency: branch.currency,
        salesMinor,
        taxMinor: rollup.taxMinor,
        ordersCount,
        averageTicketMinor: averageTicketMinor(salesMinor, ordersCount),
        paidMinor,
        unpaidMinor: unpaidMinor(salesMinor, paidMinor),
        cancelledCount: rollup.cancelledCount,
        draftCount: rollup.draftCount,
        byType: fillByType(byTypeRows),
        byPaymentMethod: fillByPaymentMethod(byMethodRows),
        topItems: topItems.map((item) => ({
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          quantity: item.quantity,
          revenueMinor: item.revenueMinor,
        })),
      };
    });
  }
}
