import { pageQuerySchema } from '@app/shared';
import { createZodDto } from 'nestjs-zod';

/** Optional `page` + `pageSize` query params shared by every page-capable list endpoint. */
export class PageQueryDto extends createZodDto(pageQuerySchema) {}
