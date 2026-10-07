import { Inject, Injectable } from '@nestjs/common';

import type {
  CreateModifierBody,
  CreateModifierGroupBody,
  PatchModifierBody,
  PatchModifierGroupBody,
  ReorderModifiersBody,
} from '@app/shared';

import { NotFoundError, ValidationError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { newUuidV7 } from '../../lib/uuid';
import { OrgSettingsService } from '../tenancy/org-settings.service';

import { validateReorderIds } from './catalog-reorder';
import { mapModifier, mapModifierGroup } from './catalog.mapper';
import { requireLocalizedText } from './catalog-validation';
import { CatalogRepository } from './catalog.repository';

@Injectable()
export class ModifierGroupsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: CatalogRepository,
    private readonly orgSettings: OrgSettingsService,
  ) {}

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listModifierGroups(tx, ctx.orgId);
      return { items: rows.map((row) => mapModifierGroup(row)) };
    });
  }

  async get(ctx: RequestContext, groupId: string) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const group = await this.repo.findModifierGroupById(tx, groupId);
      if (!group) {
        throw new NotFoundError();
      }
      const modifierRows = await this.repo.listModifiersInGroup(tx, groupId);
      return {
        ...mapModifierGroup(group),
        modifiers: modifierRows.map((m) => mapModifier(m, org.defaultCurrency)),
      };
    });
  }

  async create(ctx: RequestContext, body: CreateModifierGroupBody) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const name = requireLocalizedText(body.name, org);
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const row = await this.repo.insertModifierGroup(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        name,
        minSelect: body.minSelect,
        maxSelect: body.maxSelect,
      });
      return mapModifierGroup(row);
    });
  }

  async patch(ctx: RequestContext, groupId: string, body: PatchModifierGroupBody) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const name = body.name !== undefined ? requireLocalizedText(body.name, org) : undefined;
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findModifierGroupById(tx, groupId);
      if (!existing) {
        throw new NotFoundError();
      }
      const minSelect = body.minSelect ?? existing.minSelect;
      const maxSelect = body.maxSelect ?? existing.maxSelect;
      if (minSelect > maxSelect) {
        throw new ValidationError('minSelect must be less than or equal to maxSelect');
      }
      const updated = await this.repo.updateModifierGroup(tx, groupId, {
        name,
        minSelect: body.minSelect,
        maxSelect: body.maxSelect,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      return mapModifierGroup(updated);
    });
  }

  async remove(ctx: RequestContext, groupId: string) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const deleted = await this.repo.softDeleteModifierGroup(tx, groupId);
      if (!deleted) {
        throw new NotFoundError();
      }
      return mapModifierGroup(deleted);
    });
  }

  async createModifier(ctx: RequestContext, groupId: string, body: CreateModifierBody) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const name = requireLocalizedText(body.name, org);
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const group = await this.repo.findModifierGroupById(tx, groupId);
      if (!group) {
        throw new NotFoundError();
      }
      const sortOrder = await this.repo.nextModifierSortOrder(tx, groupId);
      const row = await this.repo.insertModifier(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        groupId,
        name,
        priceDeltaMinor: body.priceDeltaMinor,
        isActive: body.isActive ?? true,
        sortOrder,
      });
      return mapModifier(row, org.defaultCurrency);
    });
  }

  async patchModifier(
    ctx: RequestContext,
    groupId: string,
    modifierId: string,
    body: PatchModifierBody,
  ) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const name = body.name !== undefined ? requireLocalizedText(body.name, org) : undefined;
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findModifierById(tx, modifierId, groupId);
      if (!existing) {
        throw new NotFoundError();
      }
      const updated = await this.repo.updateModifier(tx, modifierId, {
        name,
        priceDeltaMinor: body.priceDeltaMinor,
        isActive: body.isActive,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      return mapModifier(updated, org.defaultCurrency);
    });
  }

  async removeModifier(ctx: RequestContext, groupId: string, modifierId: string) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findModifierById(tx, modifierId, groupId);
      if (!existing) {
        throw new NotFoundError();
      }
      const deleted = await this.repo.softDeleteModifier(tx, modifierId);
      if (!deleted) {
        throw new NotFoundError();
      }
      return mapModifier(deleted, org.defaultCurrency);
    });
  }

  async reorderModifiers(ctx: RequestContext, groupId: string, body: ReorderModifiersBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const group = await this.repo.findModifierGroupById(tx, groupId);
      if (!group) {
        throw new NotFoundError();
      }
      const locked = await this.repo.lockActiveModifiersInGroupForUpdate(tx, groupId);
      validateReorderIds(body.orderedIds, locked.map((r) => r.id));
      for (let i = 0; i < body.orderedIds.length; i += 1) {
        const id = body.orderedIds[i];
        if (id) {
          await this.repo.setModifierSortOrder(tx, id, i);
        }
      }
      const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
      const rows = await this.repo.listModifiersInGroup(tx, groupId);
      return { items: rows.map((m) => mapModifier(m, org.defaultCurrency)) };
    });
  }
}
