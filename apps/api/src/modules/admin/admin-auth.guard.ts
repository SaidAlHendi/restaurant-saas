import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import { adminRoleSatisfies, type AdminRole } from '@app/shared';
import type { Request } from 'express';

import { ForbiddenError, UnauthorizedError } from '../../core/errors/app-errors';
import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../core/db/admin-db.tokens';
import { adminSessions, adminUsers } from '../../core/db/schema/admin';
import { ADMIN_CONTEXT_KEY, type AdminContext } from './admin-context';
import { AdminJwtService } from './admin-jwt.service';
import { ADMIN_MIN_ROLE_KEY } from './require-admin-role.decorator';

/**
 * Guard for every /v1/admin/* route except login/refresh/logout. Routes must also be @Public() so the
 * global tenant AuthGuard skips them. The role is re-read from the database on each request, so
 * deactivation or demotion takes effect immediately instead of when the token expires.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: AdminJwtService,
    @Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('ADMIN_UNAUTHORIZED', 'Missing admin access token');
    }
    let payload;
    try {
      payload = this.jwt.verify(header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedError('ADMIN_UNAUTHORIZED', 'Invalid admin access token');
    }

    const rows = await this.db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        revokedAt: adminSessions.revokedAt,
        expiresAt: adminSessions.expiresAt,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
      .where(and(eq(adminSessions.id, payload.sid), eq(adminSessions.adminUserId, payload.sub)))
      .limit(1);
    const row = rows[0];
    if (!row || !row.isActive || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedError('ADMIN_SESSION_INVALID', 'Admin session is not active');
    }

    const minimum = this.reflector.getAllAndOverride<AdminRole | undefined>(ADMIN_MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (minimum && !adminRoleSatisfies(row.role, minimum)) {
      throw new ForbiddenError('Insufficient admin role', {}, 'ADMIN_FORBIDDEN');
    }

    const admin: AdminContext = {
      adminUserId: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      sessionId: payload.sid,
      ip: request.ip,
    };
    (request as Request & { [ADMIN_CONTEXT_KEY]: AdminContext })[ADMIN_CONTEXT_KEY] = admin;
    return true;
  }
}
