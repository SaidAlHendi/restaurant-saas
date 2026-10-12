import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { IdentityModule } from '../../modules/identity/identity.module';

import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, IdentityModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
