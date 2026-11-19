import { createZodDto } from 'nestjs-zod';

import { leadCreateBodySchema } from '@app/shared';

export class CreateLeadDto extends createZodDto(leadCreateBodySchema) {}
