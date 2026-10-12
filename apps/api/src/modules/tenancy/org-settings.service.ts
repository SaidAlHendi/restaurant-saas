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
    return withOrg(this.db, ctx.orgId, async (tx) => {
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

      if (body.locales !== undefined || body.defaultLocale !== undefined) {
        this.purgeMenuCache(ctx.orgId);
      }

      return this.mapOrgSettings(tx, ctx.orgId);
    });
  }

  async uploadLogo(ctx: RequestContext, file: Express.Multer.File) {
    this.logos.assertFileSize(file.size);
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.tenancyRepo.findOrganizationById(tx, ctx.orgId);
      if (!org) {
        throw new NotFoundError();
      }
      const { primaryKey } = await this.logos.processAndUpload(ctx.orgId, file.buffer);
      await this.logos.deleteLogoKeys(org.logoKey);
      await this.tenancyRepo.updateOrganization(tx, ctx.orgId, { logoKey: primaryKey });
      this.purgeMenuCache(ctx.orgId);
      const url = logoUrlFromKey(this.storage, primaryKey);
      if (!url) {
        throw new NotFoundError('Logo URL could not be resolved');
      }
      return { logoUrl: url };
    });
  }

  async deleteLogo(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.tenancyRepo.findOrganizationById(tx, ctx.orgId);
      if (!org) {
        throw new NotFoundError();
      }
      await this.logos.deleteLogoKeys(org.logoKey);
      await this.tenancyRepo.updateOrganization(tx, ctx.orgId, { logoKey: null });
      this.purgeMenuCache(ctx.orgId);
      return { logoUrl: null };
    });
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

  private purgeMenuCache(orgId: string): void {
    scheduleMenuCachePurge(this.db, this.tenancyRepo, this.menuCachePurger, orgId, this.logger);
  }
}
