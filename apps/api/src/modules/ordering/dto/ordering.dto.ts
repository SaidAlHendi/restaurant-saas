import { createZodDto } from 'nestjs-zod';

import {
  addOrderItemsBodySchema,
  billListQuerySchema,
  createBillPaymentBodySchema,
  changeOrderStatusBodySchema,
  createDiningTableBodySchema,
  createOrderBodySchema,
  createPaymentBodySchema,
  moveOrderTableBodySchema,
  orderListQuerySchema,
  patchDiningTableBodySchema,
  voidOrderItemBodySchema,
} from '@app/shared';

export class CreateOrderBodyDto extends createZodDto(createOrderBodySchema) {}
export class CreatePaymentBodyDto extends createZodDto(createPaymentBodySchema) {}
export class OrderListQueryDto extends createZodDto(orderListQuerySchema) {}
export class ChangeOrderStatusBodyDto extends createZodDto(changeOrderStatusBodySchema) {}
export class AddOrderItemsBodyDto extends createZodDto(addOrderItemsBodySchema) {}
export class MoveOrderTableBodyDto extends createZodDto(moveOrderTableBodySchema) {}
export class VoidOrderItemBodyDto extends createZodDto(voidOrderItemBodySchema) {}

export class CreateDiningTableBodyDto extends createZodDto(createDiningTableBodySchema) {}
export class PatchDiningTableBodyDto extends createZodDto(patchDiningTableBodySchema) {}
export class BillListQueryDto extends createZodDto(billListQuerySchema) {}
export class CreateBillPaymentBodyDto extends createZodDto(createBillPaymentBodySchema) {}
