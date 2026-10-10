import { Inject, Injectable } from '@nestjs/common';

import type { CreateDiningTableBody, PatchDiningTableBody } from '@app/shared';

import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { ConflictError, NotFoundError } from '../../core/errors/app-errors';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { generateQrToken } from '../../lib/qr-token';
import { newUuidV7 } from '../../lib/uuid';

import { mapDiningTable } from './ordering.mapper';
import { OrderingRepository } from './ordering.repository';

@Injectable()
export class TablesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: OrderingRepository,
  ) {}

  list(ctx: RequestContext, branchId: string, includeQrToken: boolean) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listTables(tx, branchId);
      return {
        items: rows.map((row) => mapDiningTable(row, includeQrToken)),
      };
    });
  }

  create(ctx: RequestContext, branchId: string, body: CreateDiningTableBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      try {
        const row = await this.repo.insertTable(tx, {
          id: newUuidV7(),
          orgId: ctx.orgId,
          branchId,
          label: body.label,
          qrToken: generateQrToken(),
          isActive: true,
        });
        return mapDiningTable(row, true);
      } catch (err: unknown) {
        if (isPgUniqueViolation(err, 'tables_branch_label_unique')) {
          throw new ConflictError(
            'Table label already exists in this branch',
            { label: body.label },
            'TABLE_LABEL_TAKEN',
          );
        }
        throw err;
      }
    });
  }

  patch(ctx: RequestContext, branchId: string, tableId: string, body: PatchDiningTableBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findTableById(tx, branchId, tableId);
      if (!existing) {
        throw new NotFoundError();
      }
      const patch: Partial<Pick<PatchDiningTableBody, 'label' | 'isActive'>> = {};
      if (body.label !== undefined) {
        patch.label = body.label;
      }
      if (body.isActive !== undefined) {
        patch.isActive = body.isActive;
      }
      try {
        const row = await this.repo.updateTable(tx, branchId, tableId, patch);
        if (!row) {
          throw new NotFoundError();
        }
        return mapDiningTable(row, true);
      } catch (err: unknown) {
        if (isPgUniqueViolation(err, 'tables_branch_label_unique')) {
          throw new ConflictError(
            'Table label already exists in this branch',
            { label: body.label ?? existing.label },
            'TABLE_LABEL_TAKEN',
          );
        }
        throw err;
      }
    });
  }
}
