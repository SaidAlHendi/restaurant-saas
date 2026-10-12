import { createZodDto } from 'nestjs-zod';

import { dailyReportQuerySchema } from '@app/shared';

export class DailyReportQueryDto extends createZodDto(dailyReportQuerySchema) {}
