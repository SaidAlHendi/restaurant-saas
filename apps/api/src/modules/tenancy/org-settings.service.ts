import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Express } from 'express';

import type { OrgLocaleCode, PatchOrgSettingsBody } from '@app/shared';

import { MENU_CACHE_PURGER, type MenuCachePurger } from '../../core/cache/menu-cache-purger';
import { NotFoundError, ValidationError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { DrizzleTx } from '../../core/db/with-org';
import { withOrg } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { logoUrlFromKey } from '../public-menu/public-menu.mapper';
import { scheduleMenuCachePurge } from '../public-menu/public-menu-cache.util';

import { OrgLogoService } from './org-logo.service';
import { TenancyRepository } from './tenancy.repository';

export type OrgCatalogSettings = {
  defaultLocale: string;
  locales: string[];
  defaultCurrency: string;
};

@Injectable()
export class OrgSettingsService {
  private readonly logger = new Logger(OrgSettingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tenancyRepo: TenancyRepository,
    private readonly logos: OrgLogoService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(MENU_CACHE_PURGER) private readonly menuCachePurger: MenuCachePurger,
  ) {}

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

  getSettings(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => this.mapOrgSettings(tx, ctx.orgId));
  }

  async patchSettings(ctx: RequestContext, body: PatchOrgSettingsBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.tenancyRepo.findOrganizationById(tx, ctx.orgId);
      if (!org) {
        throw new NotFoundError();
      }

      const nextLocales = body.locales ?? (org.locales as OrgLocaleCode[]);
      const nextDefaultLocale = body.defaultLocale ?? org.defaultLocale;

      if (!nextLocales.includes(nextDefaultLocale as OrgLocaleCode)) {
        throw new ValidationError('defaultLocale must be included in locales', {}, 'VALIDATION_ERROR');
      }

      const updated = await this.tenancyRepo.updateOrganization(tx, ctx.orgId, {
        name: body.name,
        locales: body.locales,
        defaultLocale: body.defaultLocale,
      });
      if (!updated) {
        throw new NotFoundError();
      }

      return this.mapOrgSettings(tx, ctx.orgId);
    });

    if (
      body.name !== undefined ||
      body.locales !== undefined ||
      body.defaultLocale !== undefined
    ) {
      this.purgeMenuCache(ctx.orgId);
    }

    return result;
  }

  async uploadLogo(ctx: RequestContext, file: Express.Multer.File) {
    this.logos.assertFileSize(file.size);
    const orgId = ctx.orgId;
    const { primaryKey } = await this.logos.processAndUpload(orgId, file.buffer);

    let previousLogoKey: string | null;
    try {
      previousLogoKey = await withOrg(this.db, orgId, async (tx) => {
        const org = await this.tenancyRepo.findOrganizationById(tx, orgId);
        if (!org) {
          throw new NotFoundError();
        }
        const priorKey = org.logoKey;
        const updated = await this.tenancyRepo.updateOrganization(tx, orgId, { logoKey: primaryKey });
        if (!updated) {
          throw new NotFoundError();
        }
        return priorKey;
      });
    } catch (err: unknown) {
      await this.deleteLogoKeysBestEffort(primaryKey);
      throw err;
    }

    if (previousLogoKey !== null && previousLogoKey.length > 0) {
      await this.deleteLogoKeysBestEffort(previousLogoKey);
    }
    this.purgeMenuCache(orgId);

    const url = logoUrlFromKey(this.storage, primaryKey);
    if (!url) {
      throw new NotFoundError('Logo URL could not be resolved');
    }
    return { logoUrl: url };
  }

  async deleteLogo(ctx: RequestContext) {
    const orgId = ctx.orgId;
    const previousLogoKey = await withOrg(this.db, orgId, async (tx) => {
      const org = await this.tenancyRepo.findOrganizationById(tx, orgId);
      if (!org) {
        throw new NotFoundError();
      }
      const priorKey = org.logoKey;
      const updated = await this.tenancyRepo.updateOrganization(tx, orgId, { logoKey: null });
      if (!updated) {
        throw new NotFoundError();
      }
      return priorKey;
    });

    if (previousLogoKey !== null && previousLogoKey.length > 0) {
      await this.deleteLogoKeysBestEffort(previousLogoKey);
    }
    this.purgeMenuCache(orgId);
    return { logoUrl: null };
  }

  private async deleteLogoKeysBestEffort(logoKey: string): Promise<void> {
    try {
      await this.logos.deleteLogoKeys(logoKey);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Failed to delete logo objects for key ${logoKey}: ${message}`);
    }
  }

  logoUrlForOrg(logoKey: string | null | undefined): string | null {
    return logoUrlFromKey(this.storage, logoKey);
  }

  private async mapOrgSettings(tx: DrizzleTx, orgId: string) {
    const org = await this.tenancyRepo.findOrganizationById(tx, orgId);
    if (!org) {
      throw new NotFoundError();
    }
    return {
      name: org.name,
      slug: org.slug,
      defaultCurrency: org.defaultCurrency,
      defaultLocale: org.defaultLocale as OrgLocaleCode,
      locales: org.locales as OrgLocaleCode[],
      logoUrl: this.logoUrlForOrg(org.logoKey),
    };
  }

  /** Active branch ids of the org, for callers outside tenancy (billing quantity). */
  listActiveBranchIds(tx: DrizzleTx, orgId: string): Promise<string[]> {
    return this.tenancyRepo.listActiveBranchIds(tx, orgId);
  }

  /** Fire-and-forget public menu CDN purge for the org (logs on failure). */
  purgeMenuCache(orgId: string): void {
    scheduleMenuCachePurge(this.db, this.tenancyRepo, this.menuCachePurger, orgId, this.logger);
  }
}
