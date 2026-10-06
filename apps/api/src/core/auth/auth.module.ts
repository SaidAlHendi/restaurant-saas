import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { ENV, type Env } from '../../config/config.module';
import { JwtAccessService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env): JwtModuleOptions => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: {
          expiresIn: env.JWT_ACCESS_TTL as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
        },
      }),
    }),
  ],
  providers: [JwtAccessService, RefreshTokenService],
  exports: [JwtAccessService, RefreshTokenService, JwtModule],
})
export class AuthModule {}
