import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Express } from 'express';

import {
  CATALOG_UPDATED_EVENT,
  DEFAULT_DISPLAY_ITEM_STEP,
  DEFAULT_DISPLAY_TOTAL_STEP,
  type CatalogRealtimePayload,
  type MoneyDisplay,
  type OrgLocaleCode,
  type PatchOrgSettingsBody,
} from '@app/shared';

import { MENU_CACHE_PURGER, type MenuCachePurger } from '../../core/cache/menu-cache-purger';
import { NotFoundError, ValidationError } from '../../core/errors/app-errors';
import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { organizations } from '../../core/db/schema/tenancy';
import { OutboxService } from '../../core/outbox/outbox.service';
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
  /** Display currency in force right now, or null when amounts are shown in `defaultCurrency`. */
  display: MoneyDisplay | null;
};

type OrgRow = typeof organizations.$inferSelect;

/** The org's current display currency settings, or null when no conversion applies. */
export function moneyDisplayForOrg(
  org: Pick<
    OrgRow,
    'defaultCurrency' | 'displayCurrency' | 'exchangeRate' | 'displayItemStep' | 'displayTotalStep'
  >,
): MoneyDisplay | null {
  if (
    org.displayCurrency === null ||
    org.exchangeRate === null ||
    org.displayCurrency === org.defaultCurrency
  ) {
    return null;
  }
  return {
    currency: org.displayCurrency,
    rate: org.exchangeRate,
    itemStep: org.displayItemStep,
    totalStep: org.displayTotalStep,
  };
}

@Injectable()
export class OrgSettingsService {
  private readonly logger = new Logger(OrgSettingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tenancyRepo: TenancyRepository,
    private readonly logos: OrgLogoService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(MENU_CACHE_PURGER) private readonly menuCachePurger: MenuCachePurger,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly outbox: OutboxService,
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
      display: moneyDisplayForOrg(org),
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

      const currencyPatch = this.resolveDisplayCurrencyPatch(org, body);

      const updated = await this.tenancyRepo.updateOrganization(tx, ctx.orgId, {
        name: body.name,
        locales: body.locales,
        defaultLocale: body.defaultLocale,
        ...currencyPatch,
      });
      if (!updated) {
        throw new NotFoundError();
      }

      if (!sameMoneyDisplay(moneyDisplayForOrg(org), moneyDisplayForOrg(updated))) {
        await this.writeCatalogUpdated(tx, ctx.orgId);
      }

      return this.mapOrgSettings(tx, ctx.orgId);
    });

    if (
      body.name !== undefined ||
      body.locales !== undefined ||
      body.defaultLocale !== undefined ||
      displayCurrencyTouched(body)
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
      displayCurrency: org.displayCurrency,
      exchangeRate: org.exchangeRate,
      exchangeRateUpdatedAt: org.exchangeRateUpdatedAt?.toISOString() ?? null,
      displayItemStep: org.displayItemStep,
      displayTotalStep: org.displayTotalStep,
    };
  }

  /**
   * Columns to write for the display currency part of a settings patch. Choosing the base currency
   * (or null) turns the display currency off; any other currency needs an exchange rate.
   */
  private resolveDisplayCurrencyPatch(
    org: OrgRow,
    body: PatchOrgSettingsBody,
  ): Partial<typeof organizations.$inferInsert> {
    if (!displayCurrencyTouched(body)) {
      return {};
    }
    const requested = body.displayCurrency === undefined ? org.displayCurrency : body.displayCurrency;
    const nextCurrency = requested === org.defaultCurrency ? null : requested;
    if (nextCurrency === null) {
      if (body.exchangeRate !== undefined) {
        throw new ValidationError(
          'exchangeRate needs a display currency different from the base currency',
          {},
          'VALIDATION_ERROR',
        );
      }
      // Switching off also forgets the rounding, so switching on later starts from the defaults.
      return {
        displayCurrency: null,
        exchangeRate: null,
        exchangeRateUpdatedAt: null,
        displayItemStep: DEFAULT_DISPLAY_ITEM_STEP,
        displayTotalStep: DEFAULT_DISPLAY_TOTAL_STEP,
      };
    }
    // A rate belongs to one currency pair: switching the display currency needs a new rate.
    const currencyChanged = nextCurrency !== org.displayCurrency;
    const nextRate = body.exchangeRate ?? (currencyChanged ? null : org.exchangeRate);
    if (nextRate === null) {
      throw new ValidationError(
        'exchangeRate is required when the display currency differs from the base currency',
        {},
        'EXCHANGE_RATE_REQUIRED',
      );
    }
    const rateChanged = currencyChanged || nextRate !== org.exchangeRate;
    return {
      displayCurrency: nextCurrency,
      exchangeRate: nextRate,
      ...(rateChanged ? { exchangeRateUpdatedAt: this.clock.now() } : {}),
      displayItemStep: body.displayItemStep,
      displayTotalStep: body.displayTotalStep,
    };
  }

  /** Tells every POS in the org to refetch its menu, which carries the display currency. */
  private async writeCatalogUpdated(tx: DrizzleTx, orgId: string): Promise<void> {
    const branchIds = await this.tenancyRepo.listActiveBranchIds(tx, orgId);
    const version = this.clock.now().getTime();
    for (const branchId of branchIds) {
      const payload: CatalogRealtimePayload = { branchId, version };
      await this.outbox.write(tx, {
        orgId,
        branchId,
        type: CATALOG_UPDATED_EVENT,
        aggregateId: orgId,
        payload,
      });
    }
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

function displayCurrencyTouched(body: PatchOrgSettingsBody): boolean {
  return (
    body.displayCurrency !== undefined ||
    body.exchangeRate !== undefined ||
    body.displayItemStep !== undefined ||
    body.displayTotalStep !== undefined
  );
}

function sameMoneyDisplay(a: MoneyDisplay | null, b: MoneyDisplay | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.currency === b.currency &&
    a.rate === b.rate &&
    a.itemStep === b.itemStep &&
    a.totalStep === b.totalStep
  );
}
