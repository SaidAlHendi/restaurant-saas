import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import type { OrgLocaleContext } from '@app/shared';

import { TenancyRepository } from './tenancy.repository';

export type OrgCatalogSettings = OrgLocaleContext & {
  defaultCurrency: string;
};

@Injectable()
export class OrgSettingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tenancyRepo: TenancyRepository,
  ) {}

  async getCatalogSettings(orgId: string): Promise<OrgCatalogSettings> {
    const org = await withOrg(this.db, orgId, async (tx) =>
      this.tenancyRepo.findOrganizationById(tx, orgId),
    );
    if (!org) {
      throw new NotFoundError();
    }
    return {
      defaultLocale: org.defaultLocale,
      locales: org.locales,
      defaultCurrency: org.defaultCurrency,
    };
  }
}
