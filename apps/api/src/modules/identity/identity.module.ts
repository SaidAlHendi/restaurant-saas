import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityRepository } from './identity.repository';
import { IdentityService } from './identity.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [TenancyModule, AuthModule],
  controllers: [AuthController, MeController],
  providers: [IdentityRepository, IdentityService, AuthService, AuthContextService, MeService],
  exports: [AuthContextService, IdentityRepository, IdentityService],
})
export class IdentityModule {}
