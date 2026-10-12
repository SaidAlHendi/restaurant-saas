import { Test } from '@nestjs/testing';

import { DRIZZLE } from '../../core/db/db.module';
import { CLOCK } from '../../core/clock/clock.tokens';
import { OutboxService } from '../../core/outbox/outbox.service';
import { CatalogOrderingService } from '../catalog/catalog-ordering.service';
import { OrgSettingsService } from '../tenancy/org-settings.service';
import { TenancyRepository } from '../tenancy/tenancy.repository';
import { OrderingRepository } from '../ordering/ordering.repository';
import { OrderingService } from '../ordering/ordering.service';

describe('OrderingService kitchen board', () => {
  it('loads the board with a fixed number of repository calls for 1 and 20 orders', async () => {
    const listKitchenBoardOrders = jest.fn(() => {
      const orderRows = Array.from({ length: 20 }, (_, i) => ({
        id: `00000000-0000-4000-8000-00000000${String(i).padStart(4, '0')}`,
        tableId: i === 0 ? '00000000-0000-4000-8000-000000000010' : null,
        placedAt: new Date('2026-01-01T12:00:00.000Z'),
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        orderNumber: i + 1,
        type: 'takeaway' as const,
        status: 'placed' as const,
        version: 1,
        customerName: null,
        notes: null,
        paymentStatus: 'unpaid' as const,
      }));
      return Promise.resolve(orderRows);
    });
    const listOrderItemsForOrderIds = jest.fn(() =>
      Promise.resolve([
        {
          id: '00000000-0000-4000-8000-000000000020',
          orderId: '00000000-0000-4000-8000-000000000000',
          productNameSnapshot: { en: 'Burger' },
          quantity: 1,
          notes: null,
          status: 'pending' as const,
          isAddition: false,
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
          voidedAt: null,
          voidReason: null,
        },
      ]),
    );
    const listOrderItemModifiersForItemIds = jest.fn(() => Promise.resolve([]));
    const listTableLabelsForBranch = jest.fn(() =>
      Promise.resolve([{ id: '00000000-0000-4000-8000-000000000010', label: 'T1' }]),
    );
    const findBranchById = jest.fn(() =>
      Promise.resolve({
        id: '00000000-0000-4000-8000-000000000030',
        orgId: '00000000-0000-4000-8000-000000000201',
      }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderingService,
        {
          provide: DRIZZLE,
          useValue: {
            transaction: (fn: (tx: { execute: () => Promise<{ rows: [] }> }) => Promise<unknown>) =>
              fn({ execute: () => Promise.resolve({ rows: [] }) }),
          },
        },
        {
          provide: OrderingRepository,
          useValue: {
            listKitchenBoardOrders,
            listOrderItemsForOrderIds,
            listOrderItemModifiersForItemIds,
            listTableLabelsForBranch,
          },
        },
        { provide: TenancyRepository, useValue: { findBranchById } },
        { provide: CatalogOrderingService, useValue: {} },
        { provide: OrgSettingsService, useValue: {} },
        { provide: OutboxService, useValue: { write: jest.fn() } },
        { provide: CLOCK, useValue: { now: () => new Date('2026-01-01T12:30:00.000Z') } },
      ],
    }).compile();

    const ordering = moduleRef.get(OrderingService);
    const ctx = {
      orgId: '00000000-0000-4000-8000-000000000201',
      membershipId: '00000000-0000-4000-8000-000000000301',
      userId: '00000000-0000-4000-8000-000000000401',
      sessionId: '00000000-0000-4000-8000-000000000501',
      branchIds: ['00000000-0000-4000-8000-000000000030'],
      allBranches: true,
      permissions: ['orders.read'],
    };

    listKitchenBoardOrders.mockImplementationOnce(() =>
      Promise.resolve([
        {
          id: '00000000-0000-4000-8000-000000000001',
          tableId: null,
          placedAt: new Date('2026-01-01T12:00:00.000Z'),
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
          orderNumber: 1,
          type: 'takeaway' as const,
          status: 'placed' as const,
          version: 1,
          customerName: null,
          notes: null,
          paymentStatus: 'unpaid' as const,
        },
      ]),
    );

    await ordering.getKitchenBoard(ctx, '00000000-0000-4000-8000-000000000030');
    await ordering.getKitchenBoard(ctx, '00000000-0000-4000-8000-000000000030');

    expect(findBranchById).toHaveBeenCalledTimes(2);
    expect(listKitchenBoardOrders).toHaveBeenCalledTimes(2);
    expect(listOrderItemsForOrderIds).toHaveBeenCalledTimes(2);
    expect(listOrderItemModifiersForItemIds).toHaveBeenCalledTimes(2);
    expect(listTableLabelsForBranch).toHaveBeenCalledTimes(2);

    await moduleRef.close();
  });
});
