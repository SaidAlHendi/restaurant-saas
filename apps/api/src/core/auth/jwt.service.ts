import { Inject, Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

import { ENV, type Env } from '../../config/config.module';

export interface AccessTokenPayload {
  sub: string;
  org: string;
  sid: string;
}

@Injectable()
export class JwtAccessService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: NestJwtService,
  ) {}

  sign(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload);
  }

  verify(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token);
  }
}
