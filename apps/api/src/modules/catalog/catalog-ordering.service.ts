import { Injectable } from '@nestjs/common';

import type { LocalizedText, OrderLineInput } from '@app/shared';

import { BusinessRuleError } from '../../core/errors/app-errors';
import type { DrizzleTx } from '../../core/db/with-org';

import { CatalogRepository } from './catalog.repository';

export type OrderLineModifierSnapshot = {
  modifierId: string;
  nameSnapshot: LocalizedText;
  priceDeltaMinor: number;
};

export type OrderLineSnapshot = {
  productId: string;
  productNameSnapshot: LocalizedText;
  unitPriceMinor: number;
  quantity: number;
  notes: string | undefined;
  modifiers: OrderLineModifierSnapshot[];
};

@Injectable()
export class CatalogOrderingService {
  constructor(private readonly repo: CatalogRepository) {}

  async validateAndSnapshotOrderLines(
    tx: DrizzleTx,
    items: OrderLineInput[],
  ): Promise<OrderLineSnapshot[]> {
    const snapshots: OrderLineSnapshot[] = [];
    for (const item of items) {
      snapshots.push(await this.snapshotOneLine(tx, item));
    }
    return snapshots;
  }

  private async snapshotOneLine(tx: DrizzleTx, item: OrderLineInput): Promise<OrderLineSnapshot> {
    const product = await this.repo.findProductById(tx, item.productId);
    if (!product || !product.isActive) {
      throw new BusinessRuleError(
        'ORDER_PRODUCT_UNAVAILABLE',
        'Product is not available',
        { productId: item.productId },
      );
    }
    const category = await this.repo.findCategoryById(tx, product.categoryId);
    if (!category || !category.isActive) {
      throw new BusinessRuleError(
        'ORDER_PRODUCT_UNAVAILABLE',
        'Product is not available',
        { productId: item.productId },
      );
    }

    const attachedGroups = await this.repo.listProductModifierGroups(tx, item.productId);
    const modifierIdSet = new Set(item.modifierIds);
    const chosenByGroup = new Map<string, string[]>();

    for (const modifierId of item.modifierIds) {
      let matched = false;
      for (const { group } of attachedGroups) {
        const modifier = await this.repo.findModifierById(tx, modifierId, group.id);
        if (modifier && modifier.isActive) {
          matched = true;
          const list = chosenByGroup.get(group.id) ?? [];
          list.push(modifierId);
          chosenByGroup.set(group.id, list);
          break;
        }
      }
      if (!matched) {
        throw new BusinessRuleError(
          'ORDER_MODIFIERS_INVALID',
          'Modifier is not valid for this product',
          { productId: item.productId, modifierId },
        );
      }
    }

    for (const { group } of attachedGroups) {
      const count = chosenByGroup.get(group.id)?.length ?? 0;
      if (count < group.minSelect || count > group.maxSelect) {
        throw new BusinessRuleError(
          'ORDER_MODIFIERS_INVALID',
          'Modifier selection is invalid for this group',
          { productId: item.productId, groupId: group.id },
        );
      }
    }

    const modifiers: OrderLineModifierSnapshot[] = [];
    let modifierTotal = 0;
    for (const modifierId of item.modifierIds) {
      for (const { group } of attachedGroups) {
        const modifier = await this.repo.findModifierById(tx, modifierId, group.id);
        if (modifier) {
          const nameSnapshot = modifier.name as LocalizedText;
          modifiers.push({
            modifierId,
            nameSnapshot,
            priceDeltaMinor: modifier.priceDeltaMinor,
          });
          modifierTotal += modifier.priceDeltaMinor;
          break;
        }
      }
    }

    if (modifiers.length !== modifierIdSet.size) {
      throw new BusinessRuleError(
        'ORDER_MODIFIERS_INVALID',
        'Duplicate or invalid modifier selection',
        { productId: item.productId },
      );
    }

    return {
      productId: item.productId,
      productNameSnapshot: product.name as LocalizedText,
      unitPriceMinor: product.priceMinor + modifierTotal,
      quantity: item.quantity,
      notes: item.notes,
      modifiers,
    };
  }
}
