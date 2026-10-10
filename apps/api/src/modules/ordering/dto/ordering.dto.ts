import { createZodDto } from 'nestjs-zod';

import {
  addOrderItemsBodySchema,
  changeOrderStatusBodySchema,
  createDiningTableBodySchema,
  createOrderBodySchema,
  orderListQuerySchema,
  patchDiningTableBodySchema,
  voidOrderItemBodySchema,
} from '@app/shared';

export class CreateOrderBodyDto extends createZodDto(createOrderBodySchema) {}
export class OrderListQueryDto extends createZodDto(orderListQuerySchema) {}
export class ChangeOrderStatusBodyDto extends createZodDto(changeOrderStatusBodySchema) {}
export class AddOrderItemsBodyDto extends createZodDto(addOrderItemsBodySchema) {}
export class VoidOrderItemBodyDto extends createZodDto(voidOrderItemBodySchema) {}

export class CreateDiningTableBodyDto extends createZodDto(createDiningTableBodySchema) {}
export class PatchDiningTableBodyDto extends createZodDto(patchDiningTableBodySchema) {}
