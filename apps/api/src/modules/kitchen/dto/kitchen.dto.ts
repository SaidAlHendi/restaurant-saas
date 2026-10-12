import { createZodDto } from 'nestjs-zod';

import { changeOrderItemStatusBodySchema } from '@app/shared';

export class ChangeOrderItemStatusBodyDto extends createZodDto(changeOrderItemStatusBodySchema) {}
