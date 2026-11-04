import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import type { AdminLoginBody, AdminLoginResponse, AdminRefreshResponse, AdminUser } from '@app/shared';
import type { Request, Response } from 'express';

import { ENV, type Env } from '../../../config/config.module';
import { UnauthorizedError } from '../../../core/errors/app-errors';
import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { adminSessions, adminUsers } from '../../../core/db/schema/admin';
import { newUuidV7 } from '../../../lib/uuid';
import type { AdminContext } from '../admin-context';
import { AdminJwtService } from '../admin-jwt.service';
import {
  ADMIN_LOGIN_INVALID_MESSAGE,
  ADMIN_REFRESH_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_PATH,
  ADMIN_REFRESH_TTL_DAYS,
} from '../constants';
import { WithAdminService } from '../with-admin.service';

type AdminUserRow = typeof adminUsers.$inferSelect;

function toAdminUser(row: Pick<AdminUserRow, 'id' | 'email' | 'name' | 'role'>): AdminUser {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

@Injectable()
export class AdminAuthService implements OnModuleInit {
  private timingMitigationHash = '';

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb,
    private readonly jwt: AdminJwtService,
    private readonly withAdmin: WithAdminService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTimingHash();
  }

  private async ensureTimingHash(): Promise<string> {
    if (this.timingMitigationHash.length === 0) {
      this.timingMitigationHash = await argon2.hash('admin-timing-mitigation-v1', {
        type: argon2.argon2id,
      });
    }
    return this.timingMitigationHash;
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private expiresAt(): Date {
    return new Date(Date.now() + ADMIN_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  private setCookie(res: Response, raw: string): void {
    res.cookie(ADMIN_REFRESH_COOKIE_NAME, raw, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'strict',
      path: ADMIN_REFRESH_COOKIE_PATH,
      maxAge: ADMIN_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookie(res: Response): void {
    res.clearCookie(ADMIN_REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'strict',
      path: ADMIN_REFRESH_COOKIE_PATH,
    });
  }

  private readRaw(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const value = cookies?.[ADMIN_REFRESH_COOKIE_NAME];
    return value && value.length > 0 ? value : undefined;
  }

  async login(body: AdminLoginBody, req: Request, res: Response): Promise<AdminLoginResponse> {
    const email = body.email.toLowerCase();
    const rows = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    const admin = rows[0];
    const valid = await argon2.verify(admin?.passwordHash ?? (await this.ensureTimingHash()), body.password);
    // Same response for unknown email, wrong password and deactivated account (no enumeration).
    if (!admin || !valid || !admin.isActive) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', ADMIN_LOGIN_INVALID_MESSAGE);
    }

    const sessionId = newUuidV7();
    const raw = randomBytes(32).toString('base64url');
    await this.withAdmin.withAdmin(
      { adminUserId: admin.id, role: admin.role, ip: req.ip },
      { action: 'admin.login', targetType: 'admin_user', targetId: admin.id },
      async (tx) => {
        await tx.insert(adminSessions).values({
          id: sessionId,
          adminUserId: admin.id,
          tokenHash: this.hashToken(raw),
          familyId: newUuidV7(),
          expiresAt: this.expiresAt(),
          userAgent: req.headers['user-agent']?.slice(0, 512),
          ip: req.ip,
        });
        await tx.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
      },
    );

    this.setCookie(res, raw);
    return {
      accessToken: this.jwt.sign({ sub: admin.id, role: admin.role, sid: sessionId }),
      admin: toAdminUser(admin),
    };
  }

  async refresh(req: Request, res: Response): Promise<AdminRefreshResponse> {
    const raw = this.readRaw(req);
    if (!raw) {
      this.clearCookie(res);
      throw new UnauthorizedError('REFRESH_MISSING', 'Refresh token required');
    }
    const hash = this.hashToken(raw);
    const found = await this.db
      .select({ session: adminSessions, admin: adminUsers })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
      .where(eq(adminSessions.tokenHash, hash))
      .limit(1);
    const row = found[0];

    // Rotation is checked before revocation: a rotated token also has revokedAt set, so checking
    // revokedAt first would hide reuse of a stolen token.
    if (row?.session.replacedBy) {
      await this.revokeFamily(row.session.familyId);
      this.clearCookie(res);
      throw new UnauthorizedError('REFRESH_REUSE', 'Refresh token reuse detected');
    }
    if (!row || row.session.revokedAt || row.session.expiresAt < new Date() || !row.admin.isActive) {
      this.clearCookie(res);
      throw new UnauthorizedError('REFRESH_INVALID', 'Session expired');
    }

    const newSessionId = newUuidV7();
    const newRaw = randomBytes(32).toString('base64url');
    const rotated = await this.db.transaction(async (tx) => {
      const claimed = await tx
        .update(adminSessions)
        .set({ revokedAt: new Date(), replacedBy: newSessionId })
        .where(
          and(
            eq(adminSessions.id, row.session.id),
            isNull(adminSessions.revokedAt),
            isNull(adminSessions.replacedBy),
          ),
        )
        .returning({ id: adminSessions.id });
      if (claimed.length === 0) {
        return false;
      }
      await tx.insert(adminSessions).values({
        id: newSessionId,
        adminUserId: row.session.adminUserId,
        tokenHash: this.hashToken(newRaw),
        familyId: row.session.familyId,
        expiresAt: this.expiresAt(),
        userAgent: req.headers['user-agent']?.slice(0, 512),
        ip: req.ip,
      });
      return true;
    });
    if (!rotated) {
      await this.revokeFamily(row.session.familyId);
      this.clearCookie(res);
      throw new UnauthorizedError('REFRESH_REUSE', 'Refresh token reuse detected');
    }

    this.setCookie(res, newRaw);
    return {
      accessToken: this.jwt.sign({ sub: row.admin.id, role: row.admin.role, sid: newSessionId }),
    };
  }

  async logout(req: Request, res: Response): Promise<void> {
    const raw = this.readRaw(req);
    if (raw) {
      const found = await this.db
        .select({ session: adminSessions, admin: adminUsers })
        .from(adminSessions)
        .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
        .where(eq(adminSessions.tokenHash, this.hashToken(raw)))
        .limit(1);
      const row = found[0];
      if (row && !row.session.revokedAt) {
        await this.withAdmin.withAdmin(
          { adminUserId: row.admin.id, role: row.admin.role, ip: req.ip },
          { action: 'admin.logout', targetType: 'admin_user', targetId: row.admin.id },
          async (tx) => {
            await tx
              .update(adminSessions)
              .set({ revokedAt: new Date() })
              .where(eq(adminSessions.id, row.session.id));
          },
        );
      }
    }
    this.clearCookie(res);
  }

  me(admin: AdminContext): { admin: AdminUser } {
    return { admin: { id: admin.adminUserId, email: admin.email, name: admin.name, role: admin.role } };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(adminSessions.familyId, familyId), isNull(adminSessions.revokedAt)));
  }
}
