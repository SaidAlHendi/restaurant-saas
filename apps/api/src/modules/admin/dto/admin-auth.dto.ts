import { adminLoginBodySchema } from '@app/shared';
import { createZodDto } from 'nestjs-zod';

export class AdminLoginBodyDto extends createZodDto(adminLoginBodySchema) {}
