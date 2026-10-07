import { createZodDto } from 'nestjs-zod';

import {
  categoryIdParamSchema,
  modifierGroupIdParamSchema,
  modifierIdParamSchema,
  productIdParamSchema,
} from '@app/shared';

export class CategoryIdParamDto extends createZodDto(categoryIdParamSchema) {}
export class ProductIdParamDto extends createZodDto(productIdParamSchema) {}
export class ModifierGroupIdParamDto extends createZodDto(modifierGroupIdParamSchema) {}
export class ModifierIdParamDto extends createZodDto(modifierIdParamSchema) {}
