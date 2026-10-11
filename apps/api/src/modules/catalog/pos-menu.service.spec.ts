import { Test } from '@nestjs/testing';

import { DRIZZLE } from '../../core/db/db.module';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import { CatalogRepository } from './catalog.repository';
import { PosMenuService } from './pos-menu.service';

describe('PosMenuService', () => {
  it('loads menu with a fixed number of repository calls', async () => {
    const listActiveCategoriesForPosMenu = jest.fn(() =>
      Promise.resolve([{ id: 'cat-1', name: { en: 'C' }, sortOrder: 0, isActive: true }]),
    );
    const listActiveProductsForCategoryIds = jest.fn(() =>
      Promise.resolve([
        {
          id: 'prod-1',
          categoryId: 'cat-1',
          name: { en: 'P' },
          description: null,
          priceMinor: 1000,
          imageKey: null,
          sortOrder: 0,
          isActive: true,
        },
      ]),
    );
    const listProductModifierGroupsForProductIds = jest.fn(() => Promise.resolve([]));
    const listActiveModifiersForGroupIds = jest.fn(() => Promise.resolve([]));
    const findBranchById = jest.fn(() =>
      Promise.resolve({
        id: 'branch-1',
        orgId: 'org-1',
        name: 'Main',
        currency: 'USD',
        taxRateBp: 0,
        taxInclusive: false,
        timezone: 'UTC',
        receiptHeader: null,
        receiptFooter: null,
        address: null,
        isActive: true,
      }),
    );
    const findOrganizationById = jest.fn(() =>
      Promise.resolve({
        id: 'org-1',
        name: 'Org',
        logoKey: null,
      }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        PosMenuService,
        {
          provide: DRIZZLE,
          useValue: {
            transaction: (fn: (tx: { execute: () => Promise<{ rows: [] }> }) => Promise<unknown>) =>
              fn({ execute: () => Promise.resolve({ rows: [] }) }),
          },
        },
        {
          provide: CatalogRepository,
          useValue: {
            listActiveCategoriesForPosMenu,
            listActiveProductsForCategoryIds,
            listProductModifierGroupsForProductIds,
            listActiveModifiersForGroupIds,
          },
        },
        {
          provide: TenancyRepository,
          useValue: { findBranchById, findOrganizationById },
        },
        {
          provide: OBJECT_STORAGE,
          useValue: {
            publicUrl: (_key: string) => 'https://example.com/logo.png',
          } satisfies Pick<ObjectStorage, 'publicUrl'>,
        },
      ],
    }).compile();

    const service = moduleRef.get(PosMenuService);
    await service.getMenu(
      {
        orgId: 'org-1',
        membershipId: 'mem-1',
        userId: 'user-1',
        sessionId: 'sess-1',
        branchIds: ['branch-1'],
        allBranches: true,
        permissions: ['orders.create'],
      },
      'branch-1',
    );

    expect(findBranchById).toHaveBeenCalledTimes(1);
    expect(findOrganizationById).toHaveBeenCalledTimes(1);
    expect(listActiveCategoriesForPosMenu).toHaveBeenCalledTimes(1);
    expect(listActiveProductsForCategoryIds).toHaveBeenCalledTimes(1);
    expect(listProductModifierGroupsForProductIds).toHaveBeenCalledTimes(1);
    expect(listActiveModifiersForGroupIds).toHaveBeenCalledTimes(1);

    await moduleRef.close();
  });
});
