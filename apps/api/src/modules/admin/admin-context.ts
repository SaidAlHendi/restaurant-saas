import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminRole } from '@app/shared';

export interface AdminContext {
  adminUserId: string;
  email: string;
  name: string;
  role: AdminRole;
  sessionId: string;
  ip?: string;
}

export const ADMIN_CONTEXT_KEY = 'adminContext';

export const AdminCtx = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminContext => {
  const request = ctx.switchToHttp().getRequest<{ [ADMIN_CONTEXT_KEY]?: AdminContext }>();
  const admin = request[ADMIN_CONTEXT_KEY];
  if (!admin) {
    throw new Error('AdminContext missing — AdminAuthGuard must run first');
  }
  return admin;
});
