import { adminOrgIdParamSchema, adminOrgListQuerySchema } from '@app/shared';
import { createZodDto } from 'nestjs-zod';

export class AdminOrgListQueryDto extends createZodDto(adminOrgListQuerySchema) {}
export class AdminOrgIdParamDto extends createZodDto(adminOrgIdParamSchema) {}
