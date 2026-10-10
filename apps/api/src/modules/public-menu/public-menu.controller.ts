import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { Public } from '../../core/auth/public.decorator';
import { GoneError, NotFoundError } from '../../core/errors/app-errors';

import { PublicMenuQueryDto } from './dto/public-menu.dto';
import { PublicMenuService } from './public-menu.service';

const CACHE_MENU_OK = 'public, s-maxage=60, stale-while-revalidate=600';
const CACHE_MENU_MISS = 'public, s-maxage=30';
/** Rotated table tokens stay valid at the CDN until this entry expires. */
const CACHE_TABLE_OK = 'public, s-maxage=30';
const CACHE_SITEMAP_OK = 'public, s-maxage=3600, stale-while-revalidate=600';

function setCacheHeader(res: Response, value: string): void {
  res.setHeader('Cache-Control', value);
}

@Public()
@Throttle({ default: { limit: 2000, ttl: 60_000 } })
@Controller('v1/public')
export class PublicMenuController {
  constructor(private readonly publicMenu: PublicMenuService) {}

  @Get('menus/:orgSlug')
  async getMenu(
    @Param('orgSlug') orgSlug: string,
    @Query() query: PublicMenuQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const body = await this.publicMenu.getMenu(orgSlug, query);
      setCacheHeader(res, CACHE_MENU_OK);
      return body;
    } catch (err: unknown) {
      if (err instanceof NotFoundError) {
        setCacheHeader(res, CACHE_MENU_MISS);
      } else if (err instanceof GoneError) {
        setCacheHeader(res, CACHE_MENU_MISS);
      }
      throw err;
    }
  }

  @Get('menus/:orgSlug/branches/:branchSlug')
  async getBranchMenu(
    @Param('orgSlug') orgSlug: string,
    @Param('branchSlug') branchSlug: string,
    @Query() query: PublicMenuQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const body = await this.publicMenu.getBranchMenu(orgSlug, branchSlug, query);
      setCacheHeader(res, CACHE_MENU_OK);
      return body;
    } catch (err: unknown) {
      if (err instanceof NotFoundError || err instanceof GoneError) {
        setCacheHeader(res, CACHE_MENU_MISS);
      }
      throw err;
    }
  }

  @Get('tables/:token')
  async getTable(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const body = await this.publicMenu.resolveTable(token);
      setCacheHeader(res, CACHE_TABLE_OK);
      return body;
    } catch (err: unknown) {
      if (err instanceof NotFoundError) {
        setCacheHeader(res, CACHE_TABLE_OK);
      }
      throw err;
    }
  }

  @Get('sitemap')
  async getSitemap(@Res({ passthrough: true }) res: Response) {
    const body = await this.publicMenu.getSitemap();
    setCacheHeader(res, CACHE_SITEMAP_OK);
    return body;
  }
}
