import { createZodDto } from 'nestjs-zod';

import {
  billingChangePlanBodySchema,
  billingCheckoutBodySchema,
} from '@app/shared';

export class BillingCheckoutBodyDto extends createZodDto(billingCheckoutBodySchema) {}
export class BillingChangePlanBodyDto extends createZodDto(billingChangePlanBodySchema) {}
