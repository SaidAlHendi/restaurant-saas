import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '@app/shared';

export const ADMIN_MIN_ROLE_KEY = 'adminMinRole';

/** Minimum admin role for a handler or controller: support < billing < super. */
export const RequireAdminRole = (role: AdminRole) => SetMetadata(ADMIN_MIN_ROLE_KEY, role);
