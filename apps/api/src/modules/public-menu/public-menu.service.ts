import { Inject, Injectable } from '@nestjs/common';

import type { PublicMenuPayload, PublicMenuQuery, PublicSitemapResponse, PublicTablePayload } from '@app/shared';
import { publicMenuLocaleSchema } from '@app/shared';

import { GoneError, NotFoundError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { EntitlementsService } from '../billing/entitlements.service';

import { logoUrlFromKey, mapPublicCategory, mapPublicProduct } from './public-menu.mapper';
import { PublicMenuRepository } from './public-menu.repository';

const MENU_VISIBLE_STATUSES = new Set(['trial', 'active', 'past_due']);

@Injectable()
export class PublicMenuService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: PublicMenuRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getMenu(orgSlug: string, query: PublicMenuQuery): Promise<PublicMenuPayload> {
    return this.buildMenu(orgSlug, query, undefined);
  }

  async getBranchMenu(
    orgSlug: string,
    branchSlug: string,
    query: PublicMenuQuery,
  ): Promise<PublicMenuPayload> {
    return this.buildMenu(orgSlug, query, branchSlug);
  }

  async resolveTable(token: string): Promise<PublicTablePayload> {
    const resolved = await this.repo.resolveTable(token);
    if (!resolved) {
      throw new NotFoundError();
    }
    return withOrg(this.db, resolved.org_id, async (tx) => {
      const slugs = await this.repo.findBranchSlugs(tx, resolved.org_id, resolved.branch_id);
      if (!slugs) {
        throw new NotFoundError();
      }
      return {
        orgSlug: slugs.orgSlug,
        branchSlug: slugs.slug,
        tableLabel: resolved.label,
        defaultLocale: slugs.defaultLocale,
      };
    });
  }

  async getSitemap(): Promise<PublicSitemapResponse> {
    const rows = await this.repo.listSitemapOrgs();
    return {
      items: rows.map((row) => ({
        slug: row.slug,
        defaultLocale: row.default_locale,
        locales: row.locales,
      })),
    };
  }

  private async buildMenu(
    orgSlug: string,
    query: PublicMenuQuery,
    branchSlug: string | undefined,
  ): Promise<PublicMenuPayload> {
    const resolved = await this.repo.resolveOrg(orgSlug);
    if (!resolved) {
      throw new NotFoundError();
    }
    if (resolved.status === 'cancelled') {
      throw new GoneError();
    }
    if (!MENU_VISIBLE_STATUSES.has(resolved.status)) {
      throw new NotFoundError();
    }

    const orgId = resolved.org_id;
    const multilang = await this.entitlements.can(orgId, 'menu.multilang');
    const branding = await this.entitlements.can(orgId, 'menu.branding');

    const requestedLocale = query.locale;
    const defaultLocale = resolved.default_locale;
    let effectiveLocale = defaultLocale;
    if (
      multilang &&
      requestedLocale !== undefined &&
      resolved.locales.includes(requestedLocale)
    ) {
      effectiveLocale = requestedLocale;
    }
    const parsedLocale = publicMenuLocaleSchema.safeParse(effectiveLocale);
    const localeForContent = parsedLocale.success ? parsedLocale.data : 'en';

    const localesForPayload = multilang ? [...resolved.locales] : [defaultLocale];

    return withOrg(this.db, orgId, async (tx) => {
      const orgRow = await this.repo.findOrganization(tx, orgId);
      if (!orgRow) {
        throw new NotFoundError();
      }

      let branchField: PublicMenuPayload['branch'];
      let currency = orgRow.defaultCurrency;

      if (branchSlug !== undefined) {
        const branch = await this.repo.findActiveBranchBySlug(tx, orgId, branchSlug);
        if (!branch) {
          throw new NotFoundError();
        }
        branchField = {
          name: branch.name,
          slug: branch.slug,
          address: branch.address,
        };
        currency = branch.currency;
      }

      const categoryRows = await this.repo.listActiveCategories(tx, orgId);
      const categories: PublicMenuPayload['categories'] = [];

      for (const categoryRow of categoryRows) {
        const productRows = await this.repo.listActiveProductsInCategory(
          tx,
          orgId,
          categoryRow.id,
        );
        if (productRows.length === 0) {
          continue;
        }

        const productsMapped = [];
        for (const productRow of productRows) {
          const groupLinks = await this.repo.listProductModifierGroups(tx, productRow.id);
          const groups = [];
          for (const { group, link } of groupLinks) {
            const mods = await this.repo.listActiveModifiersInGroup(tx, group.id);
            if (mods.length === 0) {
              continue;
            }
            groups.push({
              group,
              linkSortOrder: link.sortOrder,
              modifiers: mods,
            });
          }
          productsMapped.push(
            mapPublicProduct(
              productRow,
              currency,
              localeForContent,
              defaultLocale,
              this.storage,
              groups,
            ),
          );
        }

        categories.push(
          mapPublicCategory(categoryRow, localeForContent, defaultLocale, productsMapped),
        );
      }

      const branchRows = await this.repo.listActiveBranches(tx, orgId);

      const payload: PublicMenuPayload = {
        org: {
          name: orgRow.name,
          slug: orgRow.slug,
          defaultLocale: orgRow.defaultLocale,
          locales: localesForPayload,
          currency: orgRow.defaultCurrency,
          logoUrl: logoUrlFromKey(this.storage, orgRow.logoKey),
        },
        branches: branchRows.map((b) => ({
          name: b.name,
          slug: b.slug,
          address: b.address,
        })),
        categories,
        effectiveLocale: localeForContent,
      };

      if (branchField !== undefined) {
        payload.branch = branchField;
      }

      if (!branding) {
        payload.poweredBy = true;
      }

      return payload;
    });
  }
}
