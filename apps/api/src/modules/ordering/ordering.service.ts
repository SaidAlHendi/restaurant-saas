import { Inject, Injectable } from '@nestjs/common';

import type {
  AddOrderItemsBody,
  ChangeOrderStatusBody,
  CreateOrderBody,
  OrderListQuery,
  OrderStatus,
  VoidOrderItemBody,
} from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../core/errors/app-errors';
import { OutboxService } from '../../core/outbox/outbox.service';
import { computeBusinessDate } from '../../lib/business-date';
import { decodeOrderListCursor, encodeOrderListCursor } from '../../lib/order-list-cursor';
import { computeLineTotalMinor, computeOrderTotals } from '../../lib/money';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { newUuidV7 } from '../../lib/uuid';
import { CatalogOrderingService } from '../catalog/catalog-ordering.service';
import { OrgSettingsService } from '../tenancy/org-settings.service';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import {
  ORDER_EVENT_TYPES,
  buildRealtimePayload,
  realtimeTypeForOrderEvent,
} from './ordering.events';
import { mapOrderDetail, mapOrderEvent, mapOrderListItem } from './ordering.mapper';
import { OrderingRepository } from './ordering.repository';
import {
  assertTransition,
  itemStatusForOrderStatus,
  voidItemPermission,
} from './state-machine';

export type PlaceOrderResult = {
  order: ReturnType<typeof mapOrderDetail>;
  created: boolean;
};

@Injectable()
export class OrderingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly repo: OrderingRepository,
    private readonly tenancyRepo: TenancyRepository,
    private readonly orgSettings: OrgSettingsService,
    private readonly catalogOrdering: CatalogOrderingService,
    private readonly outbox: OutboxService,
  ) {}

  async createOrder(
    ctx: RequestContext,
    branchId: string,
    body: CreateOrderBody,
  ): Promise<PlaceOrderResult> {
    try {
      return await this.createOrderInTransaction(ctx, branchId, body);
    } catch (err: unknown) {
      if (isPgUniqueViolation(err, 'orders_branch_client_order_id_unique')) {
        const existing = await withOrg(this.db, ctx.orgId, async (tx) =>
          this.repo.findOrderByClientOrderId(tx, branchId, body.clientOrderId),
        );
        if (!existing) {
          throw err;
        }
        const detail = await this.loadOrderDetail(ctx.orgId, branchId, existing.id);
        return { order: detail, created: false };
      }
      throw err;
    }
  }

  private async createOrderInTransaction(
    ctx: RequestContext,
    branchId: string,
    body: CreateOrderBody,
  ): Promise<PlaceOrderResult> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findOrderByClientOrderId(tx, branchId, body.clientOrderId);
      if (existing) {
        const detail = await this.loadOrderDetailInTx(tx, branchId, existing.id);
        return { order: detail, created: false };
      }

      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch || branch.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }

      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      if (branch.currency !== org.defaultCurrency) {
        throw new BusinessRuleError(
          'BRANCH_CURRENCY_MISMATCH',
          'Branch currency does not match organization default currency',
          { branchCurrency: branch.currency, orgCurrency: org.defaultCurrency },
        );
      }

      if (body.type === 'dine_in' && body.tableId) {
        const table = await this.repo.findActiveTableForBranch(tx, branchId, body.tableId);
        if (!table) {
          throw new NotFoundError();
        }
      }

      const lineSnapshots = await this.catalogOrdering.validateAndSnapshotOrderLines(tx, body.items);

      const now = this.clock.now();
      const businessDate = computeBusinessDate({
        now,
        timezone: branch.timezone,
        dayStartHour: branch.dayStartHour,
      });

      const draftLines = lineSnapshots.map((line) => ({
        lineTotalMinor: computeLineTotalMinor(line.unitPriceMinor, line.quantity),
        status: 'pending' as const,
      }));
      const totals = computeOrderTotals({
        lines: draftLines,
        discountMinor: 0,
        taxRateBp: branch.taxRateBp,
        taxInclusive: branch.taxInclusive,
      });

      const orderNumber = await this.repo.nextOrderNumber(tx, branchId, businessDate, ctx.orgId);
      const orderId = newUuidV7();

      const inserted = await this.repo.insertOrder(tx, {
        id: orderId,
        orgId: ctx.orgId,
        branchId,
        clientOrderId: body.clientOrderId,
        orderNumber,
        businessDate,
        type: body.type,
        status: 'placed',
        paymentStatus: 'unpaid',
        tableId: body.tableId ?? null,
        customerName: body.customerName ?? null,
        notes: body.notes ?? null,
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        currency: branch.currency,
        version: 1,
        placedAt: now,
        createdBy: ctx.membershipId,
      });

      for (const line of lineSnapshots) {
        const itemId = newUuidV7();
        await this.repo.insertOrderItem(tx, {
          id: itemId,
          orgId: ctx.orgId,
          orderId,
          productId: line.productId,
          productNameSnapshot: line.productNameSnapshot,
          unitPriceMinor: line.unitPriceMinor,
          quantity: line.quantity,
          lineTotalMinor: computeLineTotalMinor(line.unitPriceMinor, line.quantity),
          notes: line.notes ?? null,
          status: 'pending',
          isAddition: false,
        });
        for (const mod of line.modifiers) {
          await this.repo.insertOrderItemModifier(tx, {
            id: newUuidV7(),
            orgId: ctx.orgId,
            orderItemId: itemId,
            modifierId: mod.modifierId,
            nameSnapshot: mod.nameSnapshot,
            priceDeltaMinor: mod.priceDeltaMinor,
          });
        }
      }

      await this.repo.insertOrderEvent(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        orderId,
        type: ORDER_EVENT_TYPES.placed,
        fromStatus: null,
        toStatus: 'placed',
        payload: { itemIds: [] },
        actorMembershipId: ctx.membershipId,
      });

      await this.writeOutbox(tx, ctx.orgId, branchId, orderId, ORDER_EVENT_TYPES.placed, inserted);

      const detail = await this.loadOrderDetailInTx(tx, branchId, orderId);
      return { order: detail, created: true };
    });
  }

  async getOrder(ctx: RequestContext, branchId: string, orderId: string) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.repo.findOrderById(tx, branchId, orderId);
      if (!row) {
        throw new NotFoundError();
      }
      return this.loadOrderDetailInTx(tx, branchId, orderId);
    });
  }

  async listOrders(ctx: RequestContext, branchId: string, query: OrderListQuery) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      let cursor;
      if (query.cursor) {
        try {
          cursor = decodeOrderListCursor(query.cursor);
        } catch {
          throw new ValidationError('Invalid cursor');
        }
      }
      const rows = await this.repo.listOrders(tx, branchId, {
        status: query.status,
        businessDate: query.businessDate,
        cursor,
        limit: query.limit,
      });
      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const counts = await this.repo.countItemsForOrders(
        tx,
        page.map((r) => r.id),
      );
      const last = page[page.length - 1];
      const nextCursor =
        hasMore && last
          ? encodeOrderListCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null;
      return {
        items: page.map((row) => mapOrderListItem(row, counts.get(row.id) ?? 0)),
        nextCursor,
      };
    });
  }

  async changeStatus(
    ctx: RequestContext,
    branchId: string,
    orderId: string,
    body: ChangeOrderStatusBody,
  ) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const current = await this.repo.findOrderById(tx, branchId, orderId);
      if (!current) {
        throw new NotFoundError();
      }

      const transition = assertTransition(current.status, body.to);
      if (!ctx.permissions.includes(transition.permission)) {
        throw new ForbiddenError('Insufficient permission');
      }

      if (body.to === 'cancelled' && (!body.reason || body.reason.length === 0)) {
        throw new ValidationError('Cancel reason is required');
      }
      // TODO(step 9): manager approval for cancel after placed

      const patch: {
        status: OrderStatus;
        completedAt?: Date;
        cancelledAt?: Date;
        cancelReason?: string | null;
      } = {
        status: body.to,
      };
      const now = this.clock.now();
      if (body.to === 'completed') {
        patch.completedAt = now;
      }
      if (body.to === 'cancelled') {
        patch.cancelledAt = now;
        patch.cancelReason = body.reason ?? null;
      }

      const updated = await this.repo.updateOrderStatus(
        tx,
        orderId,
        current.status,
        body.expectedVersion,
        patch,
      );
      if (!updated) {
        const detail = await this.loadOrderDetailInTx(tx, branchId, orderId);
        throw new ConflictError(
          'Order version conflict',
          { order: detail },
          'ORDER_VERSION_CONFLICT',
        );
      }

      const itemTarget = itemStatusForOrderStatus(body.to);
      if (itemTarget === 'preparing') {
        await this.repo.syncItemStatusesForOrder(tx, orderId, 'preparing', ['pending']);
      } else if (itemTarget === 'ready') {
        await this.repo.syncItemStatusesForOrder(tx, orderId, 'ready', ['preparing']);
      }

      const eventType =
        body.to === 'cancelled' ? ORDER_EVENT_TYPES.cancelled : ORDER_EVENT_TYPES.statusChanged;

      await this.repo.insertOrderEvent(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        orderId,
        type: eventType,
        fromStatus: current.status,
        toStatus: body.to,
        payload: body.reason ? { reason: body.reason } : {},
        actorMembershipId: ctx.membershipId,
      });

      await this.writeOutbox(tx, ctx.orgId, branchId, orderId, eventType, updated);

      return this.loadOrderDetailInTx(tx, branchId, orderId);
    });
  }

  async addItems(
    ctx: RequestContext,
    branchId: string,
    orderId: string,
    body: AddOrderItemsBody,
  ) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const current = await this.repo.findOrderById(tx, branchId, orderId);
      if (!current) {
        throw new NotFoundError();
      }
      if (current.status !== 'placed' && current.status !== 'preparing') {
        throw new BusinessRuleError('ORDER_NOT_EDITABLE', 'Order cannot be edited in this status', {
          status: current.status,
        });
      }
      if (current.version !== body.expectedVersion) {
        const detail = await this.loadOrderDetailInTx(tx, branchId, orderId);
        throw new ConflictError(
          'Order version conflict',
          { order: detail },
          'ORDER_VERSION_CONFLICT',
        );
      }

      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch) {
        throw new NotFoundError();
      }

      const lineSnapshots = await this.catalogOrdering.validateAndSnapshotOrderLines(tx, body.items);

      for (const line of lineSnapshots) {
        const itemId = newUuidV7();
        await this.repo.insertOrderItem(tx, {
          id: itemId,
          orgId: ctx.orgId,
          orderId,
          productId: line.productId,
          productNameSnapshot: line.productNameSnapshot,
          unitPriceMinor: line.unitPriceMinor,
          quantity: line.quantity,
          lineTotalMinor: computeLineTotalMinor(line.unitPriceMinor, line.quantity),
          notes: line.notes ?? null,
          status: current.status === 'preparing' ? 'preparing' : 'pending',
          isAddition: true,
        });
        for (const mod of line.modifiers) {
          await this.repo.insertOrderItemModifier(tx, {
            id: newUuidV7(),
            orgId: ctx.orgId,
            orderItemId: itemId,
            modifierId: mod.modifierId,
            nameSnapshot: mod.nameSnapshot,
            priceDeltaMinor: mod.priceDeltaMinor,
          });
        }
      }

      const allItems = await this.repo.listOrderItemsWithModifiers(tx, orderId);
      const totals = computeOrderTotals({
        lines: allItems.map(({ item }) => ({
          lineTotalMinor: item.lineTotalMinor,
          status: item.status,
        })),
        discountMinor: current.discountMinor,
        taxRateBp: branch.taxRateBp,
        taxInclusive: branch.taxInclusive,
      });

      const updated = await this.repo.updateOrderTotals(tx, orderId, body.expectedVersion, totals);
      if (!updated) {
        throw new ConflictError(
          'Order version conflict',
          {},
          'ORDER_VERSION_CONFLICT',
        );
      }

      await this.repo.insertOrderEvent(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        orderId,
        type: ORDER_EVENT_TYPES.itemsAdded,
        fromStatus: current.status,
        toStatus: current.status,
        payload: {},
        actorMembershipId: ctx.membershipId,
      });

      await this.writeOutbox(
        tx,
        ctx.orgId,
        branchId,
        orderId,
        ORDER_EVENT_TYPES.itemsAdded,
        updated,
      );

      return this.loadOrderDetailInTx(tx, branchId, orderId);
    });
  }

  async voidItem(
    ctx: RequestContext,
    branchId: string,
    orderId: string,
    itemId: string,
    body: VoidOrderItemBody,
  ) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const current = await this.repo.findOrderById(tx, branchId, orderId);
      if (!current) {
        throw new NotFoundError();
      }
      if (current.status !== 'placed' && current.status !== 'preparing' && current.status !== 'ready') {
        throw new BusinessRuleError('ORDER_NOT_EDITABLE', 'Order cannot be edited in this status', {
          status: current.status,
        });
      }

      const permission = voidItemPermission(current.status);
      if (!ctx.permissions.includes(permission)) {
        throw new ForbiddenError('Insufficient permission');
      }

      if (current.version !== body.expectedVersion) {
        throw new ConflictError(
          'Order version conflict',
          {},
          'ORDER_VERSION_CONFLICT',
        );
      }

      const item = await this.repo.findOrderItem(tx, orderId, itemId);
      if (!item || item.status === 'voided') {
        throw new NotFoundError();
      }

      const nonVoided = await this.repo.countNonVoidedItems(tx, orderId);
      if (nonVoided <= 1) {
        throw new BusinessRuleError(
          'ORDER_NOT_EDITABLE',
          'Cannot void the last item; cancel the order instead',
          { orderId },
        );
      }

      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch) {
        throw new NotFoundError();
      }

      await this.repo.voidOrderItem(
        tx,
        itemId,
        ctx.membershipId,
        body.reason,
        this.clock.now(),
      );

      const allItems = await this.repo.listOrderItemsWithModifiers(tx, orderId);
      const totals = computeOrderTotals({
        lines: allItems.map(({ item: row }) => ({
          lineTotalMinor: row.lineTotalMinor,
          status: row.status,
        })),
        discountMinor: current.discountMinor,
        taxRateBp: branch.taxRateBp,
        taxInclusive: branch.taxInclusive,
      });

      const updated = await this.repo.updateOrderTotals(tx, orderId, body.expectedVersion, totals);
      if (!updated) {
        throw new ConflictError(
          'Order version conflict',
          {},
          'ORDER_VERSION_CONFLICT',
        );
      }

      await this.repo.insertOrderEvent(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        orderId,
        type: ORDER_EVENT_TYPES.itemVoided,
        fromStatus: current.status,
        toStatus: current.status,
        payload: { itemId, reason: body.reason },
        actorMembershipId: ctx.membershipId,
      });

      await this.writeOutbox(
        tx,
        ctx.orgId,
        branchId,
        orderId,
        ORDER_EVENT_TYPES.itemVoided,
        updated,
      );

      return this.loadOrderDetailInTx(tx, branchId, orderId);
    });
  }

  async listEvents(ctx: RequestContext, branchId: string, orderId: string) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const order = await this.repo.findOrderById(tx, branchId, orderId);
      if (!order) {
        throw new NotFoundError();
      }
      const events = await this.repo.listOrderEvents(tx, orderId);
      return { items: events.map(mapOrderEvent) };
    });
  }

  private async loadOrderDetail(orgId: string, branchId: string, orderId: string) {
    return withOrg(this.db, orgId, async (tx) => this.loadOrderDetailInTx(tx, branchId, orderId));
  }

  private async loadOrderDetailInTx(tx: DrizzleTx, branchId: string, orderId: string) {
    const row = await this.repo.findOrderById(tx, branchId, orderId);
    if (!row) {
      throw new NotFoundError();
    }
    const items = await this.repo.listOrderItemsWithModifiers(tx, orderId);
    return mapOrderDetail(row, items);
  }

  private async writeOutbox(
    tx: DrizzleTx,
    orgId: string,
    branchId: string,
    orderId: string,
    eventType: string,
    order: { status: OrderStatus; version: number },
  ) {
    const payload = buildRealtimePayload({
      orderId,
      branchId,
      status: order.status,
      version: order.version,
    });
    await this.outbox.write(tx, {
      orgId,
      branchId,
      type: realtimeTypeForOrderEvent(eventType),
      aggregateId: orderId,
      payload,
    });
  }
}
