import { createZodDto } from 'nestjs-zod';
import {
  createPinOnlyStaffBodySchema,
  createStaffInviteBodySchema,
  patchStaffMembershipBodySchema,
  putStaffPermissionOverridesBodySchema,
  putStaffPinBodySchema,
} from '@app/shared';

export class CreateStaffInviteBodyDto extends createZodDto(createStaffInviteBodySchema) {}
export class CreatePinOnlyStaffBodyDto extends createZodDto(createPinOnlyStaffBodySchema) {}
export class PatchStaffMembershipBodyDto extends createZodDto(patchStaffMembershipBodySchema) {}
export class PutStaffPinBodyDto extends createZodDto(putStaffPinBodySchema) {}
export class PutStaffPermissionOverridesBodyDto extends createZodDto(
  putStaffPermissionOverridesBodySchema,
) {}
