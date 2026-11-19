import { createZodDto } from 'nestjs-zod';
import { createPosDeviceBodySchema } from '@app/shared';

export class CreatePosDeviceBodyDto extends createZodDto(createPosDeviceBodySchema) {}
