import { createZodDto } from 'nestjs-zod';
import { patchOrgSettingsBodySchema } from '@app/shared';

export class PatchOrgSettingsBodyDto extends createZodDto(patchOrgSettingsBodySchema) {}
