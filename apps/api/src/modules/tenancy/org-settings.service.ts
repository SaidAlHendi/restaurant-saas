import { Injectable } from '@nestjs/common';

import { NotFoundError } from '../../core/errors/app-errors';
import type { DrizzleTx } from '../../core/db/with-org';
import type { OrgLocaleContext } from '@app/shared';

import { TenancyRepository } from './tenancy.repository';

export type OrgCatalogSettings = OrgLocaleContext & {
  defaultCurrency: string;
};

@Injectable()
export class OrgSettingsService {
  constructor(private readonly tenancyRepo: TenancyRepository) {}

  async getCatalogSettings(tx: DrizzleTx, orgId: string): Promise<OrgCatalogSettings> {
    const org = await this.tenancyRepo.findOrganizationById(tx, orgId);
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
