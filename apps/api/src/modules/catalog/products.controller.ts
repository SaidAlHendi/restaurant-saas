import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ValidationError } from '../../core/errors/app-errors';
import { Ctx } from '../../core/context/context.decorator';
import type { RequestContext } from '../../core/context/request-context';
import { RequirePermission } from '../../core/permissions/require-permission.decorator';

import {
  CreateProductBodyDto,
  PatchProductBodyDto,
  ProductListQueryDto,
  ReorderProductsBodyDto,
  SetProductModifierGroupsBodyDto,
} from './dto/catalog.dto';
import { ProductsService } from './products.service';

const upload = memoryStorage();
const maxImageBytes = 5 * 1024 * 1024;

@Controller('v1/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @RequirePermission('menu.read')
  @Get()
  list(@Ctx() ctx: RequestContext, @Query() query: ProductListQueryDto) {
    return this.products.list(ctx, query);
  }

  @RequirePermission('menu.manage')
  @Put('reorder')
  reorder(@Ctx() ctx: RequestContext, @Body() body: ReorderProductsBodyDto) {
    return this.products.reorder(ctx, body);
  }

  @RequirePermission('menu.read')
  @Get(':productId')
  get(@Ctx() ctx: RequestContext, @Param('productId') productId: string) {
    return this.products.get(ctx, productId);
  }

  @RequirePermission('menu.manage')
  @Post()
  create(@Ctx() ctx: RequestContext, @Body() body: CreateProductBodyDto) {
    return this.products.create(ctx, body);
  }

  @RequirePermission('menu.manage')
  @Patch(':productId')
  patch(
    @Ctx() ctx: RequestContext,
    @Param('productId') productId: string,
    @Body() body: PatchProductBodyDto,
  ) {
    return this.products.patch(ctx, productId, body);
  }

  @RequirePermission('menu.manage')
  @Delete(':productId')
  remove(@Ctx() ctx: RequestContext, @Param('productId') productId: string) {
    return this.products.remove(ctx, productId);
  }

  @RequirePermission('menu.manage')
  @Post(':productId/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: upload,
      limits: { fileSize: maxImageBytes, files: 1 },
    }),
  )
  uploadImage(
    @Ctx() ctx: RequestContext,
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new ValidationError('File is required');
    }
    return this.products.uploadImage(ctx, productId, file);
  }

  @RequirePermission('menu.manage')
  @Delete(':productId/image')
  removeImage(@Ctx() ctx: RequestContext, @Param('productId') productId: string) {
    return this.products.removeImage(ctx, productId);
  }

  @RequirePermission('menu.manage')
  @Put(':productId/modifier-groups')
  setModifierGroups(
    @Ctx() ctx: RequestContext,
    @Param('productId') productId: string,
    @Body() body: SetProductModifierGroupsBodyDto,
  ) {
    return this.products.setModifierGroups(ctx, productId, body);
  }
}
