import { createZodDto } from 'nestjs-zod';

import {
  branchIdParamSchema,
  orderIdParamSchema,
  orderItemIdParamSchema,
  tableIdParamSchema,
} from '@app/shared';

export class BranchIdParamDto extends createZodDto(branchIdParamSchema) {}
export class OrderIdParamDto extends createZodDto(orderIdParamSchema) {}
export class OrderItemIdParamDto extends createZodDto(orderItemIdParamSchema) {}
export class TableIdParamDto extends createZodDto(tableIdParamSchema) {}
