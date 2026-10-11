import { Test } from '@nestjs/testing';

import { DRIZZLE } from '../../core/db/db.module';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { EntitlementsService } from '../billing/entitlements.service';

import { PublicMenuRepository } from './public-menu.repository';
import { PublicMenuService } from './public-menu.service';

const resolvedOrg = {
  org_id: '00000000-0000-4000-8000-000000000201',
  status: 'active',
  default_locale: 'en',
  locales: ['en', 'ar'],
};

function mockDbTransaction() {
  return jest.fn((fn: (tx: { execute: jest.Mock }) => Promise<unknown>) => {
    const tx = { execute: jest.fn().mockResolvedValue(undefined) };
    return fn(tx);
  });
}

function createPublicMenuRepoMock() {
  return {
    resolveOrg: jest.fn(),
    findOrganization: jest.fn(),
    findActiveBranchBySlug: jest.fn(),
    listActiveBranches: jest.fn().mockResolvedValue([]),
    listActiveCategories: jest.fn().mockResolvedValue([]),
    listActiveProductsForCategoryIds: jest.fn().mockResolvedValue([]),
    listProductModifierGroupsForProductIds: jest.fn().mockResolvedValue([]),
    listActiveModifiersForGroupIds: jest.fn().mockResolvedValue([]),
  };
}

describe('PublicMenuService', () => {
  it('checks menu.multilang and limits locales in payload when false', async () => {
    const can = jest.fn((_orgId: string, key: string) => Promise.resolve(key !== 'menu.multilang'));
    const transaction = mockDbTransaction();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicMenuService,
        { provide: DRIZZLE, useValue: { transaction } },
        {
          provide: PublicMenuRepository,
          useValue: {
            ...createPublicMenuRepoMock(),
            resolveOrg: jest.fn().mockResolvedValue(resolvedOrg),
          },
        },
        {
          provide: OBJECT_STORAGE,
          useValue: { publicUrl: () => 'http://example.com/logo.webp' },
        },
        { provide: EntitlementsService, useValue: { can } },
      ],
    }).compile();

    const repo = moduleRef.get(PublicMenuRepository);
    (repo.findOrganization as jest.Mock).mockResolvedValue({
      id: resolvedOrg.org_id,
      name: 'Demo',
      slug: 'demo',
      defaultLocale: 'en',
      locales: ['en', 'ar'],
      defaultCurrency: 'SAR',
      logoKey: null,
    });

    const service = moduleRef.get(PublicMenuService);
    const payload = await service.getMenu('demo', { locale: 'ar' });

    expect(can).toHaveBeenCalledWith(resolvedOrg.org_id, 'menu.multilang');
    expect(payload.org.locales).toEqual(['en']);
  });

  it('checks menu.branding and sets poweredBy when false', async () => {
    const can = jest.fn((_orgId: string, key: string) => Promise.resolve(key !== 'menu.branding'));
    const transaction = mockDbTransaction();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicMenuService,
        { provide: DRIZZLE, useValue: { transaction } },
        {
          provide: PublicMenuRepository,
          useValue: {
            ...createPublicMenuRepoMock(),
            resolveOrg: jest.fn().mockResolvedValue(resolvedOrg),
          },
        },
        {
          provide: OBJECT_STORAGE,
          useValue: { publicUrl: () => 'http://example.com/logo.webp' },
        },
        { provide: EntitlementsService, useValue: { can } },
      ],
    }).compile();

    const repo = moduleRef.get(PublicMenuRepository);
    (repo.findOrganization as jest.Mock).mockResolvedValue({
      id: resolvedOrg.org_id,
      name: 'Demo',
      slug: 'demo',
      defaultLocale: 'en',
      locales: ['en', 'ar'],
      defaultCurrency: 'SAR',
      logoKey: null,
    });

    const service = moduleRef.get(PublicMenuService);
    const payload = await service.getMenu('demo', {});

    expect(can).toHaveBeenCalledWith(resolvedOrg.org_id, 'menu.branding');
    expect(payload.poweredBy).toBe(true);
  });
});
