import { createZodDto } from 'nestjs-zod';

import { publicMenuQuerySchema } from '@app/shared';

export class PublicMenuQueryDto extends createZodDto(publicMenuQuerySchema) {}
