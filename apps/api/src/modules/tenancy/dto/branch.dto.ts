import { createZodDto } from 'nestjs-zod';
import { createBranchBodySchema, patchBranchBodySchema } from '@app/shared';

export class CreateBranchBodyDto extends createZodDto(createBranchBodySchema) {}
export class PatchBranchBodyDto extends createZodDto(patchBranchBodySchema) {}
