import { Test } from '@nestjs/testing';

import { DRIZZLE } from '../../core/db/db.module';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { EntitlementsService } from '../billing/entitlements.service';
import { OrgSettingsService } from '../tenancy/org-settings.service';

import { CatalogRepository } from './catalog.repository';
import { CatalogMenuCacheNotifier } from './catalog-menu-cache.notifier';
import { ProductImageService } from './product-image.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  it('calls entitlements.assertWithinLimit on create', async () => {
    const assertWithinLimit = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: DRIZZLE,
          useValue: {
            transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
              const tx = {
                execute: jest.fn().mockResolvedValue(undefined),
              };
              return fn(tx);
            }),
          },
        },
        {
          provide: CatalogRepository,
          useValue: {
            findCategoryById: jest.fn().mockResolvedValue({ id: 'cat' }),
            countNonDeletedProducts: jest.fn().mockResolvedValue(3),
            nextProductSortOrderInCategory: jest.fn().mockResolvedValue(0),
            insertProduct: jest.fn().mockResolvedValue({
              id: 'p1',
              orgId: 'org',
              categoryId: 'cat',
              name: { en: 'Tea' },
              description: null,
              priceMinor: 100,
              imageKey: null,
              isActive: true,
              sortOrder: 0,
            }),
          },
        },
        {
          provide: OrgSettingsService,
          useValue: {
            getCatalogSettings: jest.fn().mockResolvedValue({
              defaultLocale: 'en',
              locales: ['en', 'ar'],
              defaultCurrency: 'SAR',
            }),
          },
        },
        {
          provide: EntitlementsService,
          useValue: { assertWithinLimit },
        },
        {
          provide: ProductImageService,
          useValue: {},
        },
        {
          provide: OBJECT_STORAGE,
          useValue: { publicUrl: () => 'http://example.com/x.webp' },
        },
        {
          provide: CatalogMenuCacheNotifier,
          useValue: { afterCatalogChange: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(ProductsService);
    await service.create(
      {
        userId: 'u',
        orgId: 'org',
        membershipId: 'm',
        sessionId: 's',
        branchIds: [],
        allBranches: true,
        permissions: ['menu.manage'],
      },
      {
        categoryId: '00000000-0000-4000-8000-000000000301',
        name: { en: 'Tea', ar: 'شاي' },
        priceMinor: 500,
      },
    );

    expect(assertWithinLimit).toHaveBeenCalledWith('org', 'limit.products', 4);
  });
});
