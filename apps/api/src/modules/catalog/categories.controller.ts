import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { CategoriesService } from './categories.service';
import { CreateCategoryBodyDto, PatchCategoryBodyDto, ReorderBodyDto } from './dto/catalog.dto';

@Controller('v1/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @RequirePermission('menu.read')
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.categories.list(ctx);
  }

  @RequirePermission('menu.manage')
  @Put('reorder')
  reorder(@Ctx() ctx: RequestContext, @Body() body: ReorderBodyDto) {
    return this.categories.reorder(ctx, body);
  }

  @RequirePermission('menu.manage')
  @Post()
  create(@Ctx() ctx: RequestContext, @Body() body: CreateCategoryBodyDto) {
    return this.categories.create(ctx, body);
  }

  @RequirePermission('menu.manage')
  @Patch(':categoryId')
  patch(
    @Ctx() ctx: RequestContext,
    @Param('categoryId') categoryId: string,
    @Body() body: PatchCategoryBodyDto,
  ) {
    return this.categories.patch(ctx, categoryId, body);
  }

  @RequirePermission('menu.manage')
  @Delete(':categoryId')
  remove(@Ctx() ctx: RequestContext, @Param('categoryId') categoryId: string) {
    return this.categories.remove(ctx, categoryId);
  }
}
