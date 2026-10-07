import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';

import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import { ModifierGroupsService } from './modifier-groups.service';
import {
  CreateModifierBodyDto,
  CreateModifierGroupBodyDto,
  PatchModifierBodyDto,
  PatchModifierGroupBodyDto,
  ReorderModifiersBodyDto,
} from './dto/catalog.dto';
import { CatalogPathIdPipe } from './pipes/catalog-path-id.pipe';

@Controller('v1/modifier-groups')
export class ModifierGroupsController {
  constructor(private readonly groups: ModifierGroupsService) {}

  @RequirePermission('menu.read')
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.groups.list(ctx);
  }

  @RequirePermission('menu.read')
  @Get(':groupId')
  get(@Ctx() ctx: RequestContext, @Param('groupId', CatalogPathIdPipe) groupId: string) {
    return this.groups.get(ctx, groupId);
  }

  @RequirePermission('menu.manage')
  @Post()
  create(@Ctx() ctx: RequestContext, @Body() body: CreateModifierGroupBodyDto) {
    return this.groups.create(ctx, body);
  }

  @RequirePermission('menu.manage')
  @Patch(':groupId')
  patch(
    @Ctx() ctx: RequestContext,
    @Param('groupId', CatalogPathIdPipe) groupId: string,
    @Body() body: PatchModifierGroupBodyDto,
  ) {
    return this.groups.patch(ctx, groupId, body);
  }

  @RequirePermission('menu.manage')
  @Delete(':groupId')
  remove(@Ctx() ctx: RequestContext, @Param('groupId', CatalogPathIdPipe) groupId: string) {
    return this.groups.remove(ctx, groupId);
  }

  @RequirePermission('menu.manage')
  @Post(':groupId/modifiers')
  createModifier(
    @Ctx() ctx: RequestContext,
    @Param('groupId', CatalogPathIdPipe) groupId: string,
    @Body() body: CreateModifierBodyDto,
  ) {
    return this.groups.createModifier(ctx, groupId, body);
  }

  @RequirePermission('menu.manage')
  @Put(':groupId/modifiers/reorder')
  reorderModifiers(
    @Ctx() ctx: RequestContext,
    @Param('groupId', CatalogPathIdPipe) groupId: string,
    @Body() body: ReorderModifiersBodyDto,
  ) {
    return this.groups.reorderModifiers(ctx, groupId, body);
  }

  @RequirePermission('menu.manage')
  @Patch(':groupId/modifiers/:modifierId')
  patchModifier(
    @Ctx() ctx: RequestContext,
    @Param('groupId', CatalogPathIdPipe) groupId: string,
    @Param('modifierId', CatalogPathIdPipe) modifierId: string,
    @Body() body: PatchModifierBodyDto,
  ) {
    return this.groups.patchModifier(ctx, groupId, modifierId, body);
  }

  @RequirePermission('menu.manage')
  @Delete(':groupId/modifiers/:modifierId')
  removeModifier(
    @Ctx() ctx: RequestContext,
    @Param('groupId', CatalogPathIdPipe) groupId: string,
    @Param('modifierId', CatalogPathIdPipe) modifierId: string,
  ) {
    return this.groups.removeModifier(ctx, groupId, modifierId);
  }
}
