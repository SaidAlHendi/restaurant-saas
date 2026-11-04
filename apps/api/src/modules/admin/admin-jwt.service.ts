import { Inject, Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import type { AdminRole } from '@app/shared';

import { ENV, type Env } from '../../config/config.module';
import { ADMIN_JWT_AUDIENCE } from './constants';

export interface AdminTokenPayload {
  sub: string;
  role: AdminRole;
  sid: string;
}

/** Signs and verifies admin access tokens with their own secret and `aud: "admin"`. */
@Injectable()
export class AdminJwtService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: NestJwtService,
  ) {}

  private secret(): string {
    if (!this.env.JWT_ADMIN_SECRET) {
      throw new Error('JWT_ADMIN_SECRET is not configured');
    }
    return this.env.JWT_ADMIN_SECRET;
  }

  sign(payload: AdminTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.secret(),
      audience: ADMIN_JWT_AUDIENCE,
      expiresIn: this.env.JWT_ADMIN_TTL as unknown as number,
    });
  }

  verify(token: string): AdminTokenPayload {
    return this.jwt.verify<AdminTokenPayload>(token, {
      secret: this.secret(),
      audience: ADMIN_JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
  }
}
