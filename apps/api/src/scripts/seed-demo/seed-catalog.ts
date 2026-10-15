import type { DrizzleDb } from '../../core/db/db.module';
import { productModifierGroups } from '../../core/db/schema/catalog';
import { withOrg } from '../../core/db/with-org';
import { CatalogRepository } from '../../modules/catalog/catalog.repository';

import { productGlobalKey } from './data/index';
import type { OrgSeedDefinition } from './data/types';
import { createDemoRng, deterministicUuid } from './random';
import type { SeededOrg } from './seed-orgs';

function pickModifierGroupsForProduct(
  definition: OrgSeedDefinition,
  productKey: string,
  rngScope: string,
): string[] {
  const product = definition.products.find((p) => p.key === productKey);
  // An explicit list (including []) wins; only products without one get random links.
  if (product?.modifierGroupKeys !== undefined) {
    return product.modifierGroupKeys;
  }
  const rng = createDemoRng(rngScope, productGlobalKey(definition.slug, productKey));
  if (rng() > 0.42) {
    return [];
  }
  const groupKeys = definition.modifierGroups.map((g) => g.key);
  if (groupKeys.length === 0) {
    return [];
  }
  const pickGroupKey = (): string => {
    const idx = Math.floor(rng() * groupKeys.length);
    const key = groupKeys[idx];
    if (key === undefined) {
      throw new Error('pickGroupKey: empty modifier groups');
    }
    return key;
  };
  const first = pickGroupKey();
  const second = pickGroupKey();
  return first === second ? [first] : [first, second];
}

export async function seedCatalogForOrg(db: DrizzleDb, seeded: SeededOrg): Promise<void> {
  const definition = seeded.definition;
  const orgId = seeded.id;
  const catalogRepo = new CatalogRepository();

  await withOrg(db, orgId, async (tx) => {
    const categoryIdByKey = new Map<string, string>();
    for (const cat of definition.categories) {
      const categoryId = deterministicUuid('category', definition.slug, cat.key);
      categoryIdByKey.set(cat.key, categoryId);
      const existing = await catalogRepo.findCategoryById(tx, categoryId, true);
      if (!existing) {
        await catalogRepo.insertCategory(tx, {
          id: categoryId,
          orgId,
          name: cat.name,
          sortOrder: cat.sortOrder,
          isActive: !cat.deleted,
          deletedAt: cat.deleted ? new Date('2020-01-01T00:00:00.000Z') : null,
        });
      }
    }

    const groupIdByKey = new Map<string, string>();
    for (const group of definition.modifierGroups) {
      const groupId = deterministicUuid('mod-group', definition.slug, group.key);
      groupIdByKey.set(group.key, groupId);
      const existing = await catalogRepo.findModifierGroupById(tx, groupId, true);
      if (!existing) {
        await catalogRepo.insertModifierGroup(tx, {
          id: groupId,
          orgId,
          name: group.name,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
        });
      }
      for (const mod of group.modifiers) {
        const modifierId = deterministicUuid('modifier', definition.slug, group.key, mod.key);
        const modExisting = await catalogRepo.findModifierById(tx, modifierId, groupId);
        if (!modExisting) {
          await catalogRepo.insertModifier(tx, {
            id: modifierId,
            orgId,
            groupId,
            name: mod.name,
            priceDeltaMinor: mod.priceDeltaMinor,
            isActive: true,
            sortOrder: mod.sortOrder,
          });
        }
      }
    }

    for (const product of definition.products) {
      const categoryId = categoryIdByKey.get(product.categoryKey);
      if (!categoryId) {
        throw new Error(`Unknown category ${product.categoryKey} for product ${product.key}`);
      }
      const productId = deterministicUuid('product', definition.slug, product.key);
      const existing = await catalogRepo.findProductById(tx, productId, true);
      if (!existing) {
        await catalogRepo.insertProduct(tx, {
          id: productId,
          orgId,
          categoryId,
          name: product.name,
          description: product.description,
          priceMinor: product.priceMinor,
          imageKey: null,
          isActive: product.isActive ?? true,
          sortOrder: definition.products.indexOf(product),
        });
      }

      const linkedGroups = pickModifierGroupsForProduct(definition, product.key, 'catalog-links');
      let sortOrder = 0;
      for (const groupKey of linkedGroups) {
        const groupId = groupIdByKey.get(groupKey);
        if (!groupId) {
          continue;
        }
        await tx
          .insert(productModifierGroups)
          .values({
            productId,
            groupId,
            orgId,
            sortOrder,
          })
          .onConflictDoNothing();
        sortOrder += 1;
      }
    }
  });
}
