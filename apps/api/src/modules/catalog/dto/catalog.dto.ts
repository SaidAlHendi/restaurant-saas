import { createZodDto } from 'nestjs-zod';

import {
  createCategoryBodySchema,
  createModifierBodySchema,
  createModifierGroupBodySchema,
  createProductBodySchema,
  patchCategoryBodySchema,
  patchModifierBodySchema,
  patchModifierGroupBodySchema,
  patchProductBodySchema,
  productListQuerySchema,
  reorderBodySchema,
  reorderModifiersBodySchema,
  reorderProductsBodySchema,
  setProductModifierGroupsBodySchema,
} from '@app/shared';

export class CreateCategoryBodyDto extends createZodDto(createCategoryBodySchema) {}
export class PatchCategoryBodyDto extends createZodDto(patchCategoryBodySchema) {}
export class ReorderBodyDto extends createZodDto(reorderBodySchema) {}

export class ProductListQueryDto extends createZodDto(productListQuerySchema) {}
export class CreateProductBodyDto extends createZodDto(createProductBodySchema) {}
export class PatchProductBodyDto extends createZodDto(patchProductBodySchema) {}
export class ReorderProductsBodyDto extends createZodDto(reorderProductsBodySchema) {}
export class SetProductModifierGroupsBodyDto extends createZodDto(setProductModifierGroupsBodySchema) {}

export class CreateModifierGroupBodyDto extends createZodDto(createModifierGroupBodySchema) {}
export class PatchModifierGroupBodyDto extends createZodDto(patchModifierGroupBodySchema) {}
export class CreateModifierBodyDto extends createZodDto(createModifierBodySchema) {}
export class PatchModifierBodyDto extends createZodDto(patchModifierBodySchema) {}
export class ReorderModifiersBodyDto extends createZodDto(reorderModifiersBodySchema) {}
