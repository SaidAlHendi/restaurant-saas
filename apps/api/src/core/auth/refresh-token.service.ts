import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { Response, Request } from 'express';

import { ENV, type Env } from '../../config/config.module';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TTL_DAYS,
} from '../../modules/identity/constants';

@Injectable()
export class RefreshTokenService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  generateRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  setCookie(res: Response, rawToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  clearCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    });
  }

  readRawFromRequest(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const value = cookies?.[REFRESH_COOKIE_NAME];
    return value && value.length > 0 ? value : undefined;
  }

  expiresAt(): Date {
    return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  }
}
