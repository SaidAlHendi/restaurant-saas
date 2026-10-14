import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { TenancyModule } from '../tenancy/tenancy.module';

import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityRepository } from './identity.repository';
import { IdentityService } from './identity.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { PinVerificationService } from './pin-verification.service';

@Module({
  imports: [forwardRef(() => TenancyModule), AuthModule, BillingModule],
  controllers: [AuthController, MeController],
  providers: [
    IdentityRepository,
    PinVerificationService,
    IdentityService,
    AuthService,
    AuthContextService,
    MeService,
  ],
  exports: [AuthContextService, IdentityRepository, IdentityService],
})
export class IdentityModule {}
