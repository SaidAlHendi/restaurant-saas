import { Global, Module } from '@nestjs/common';

import { CLOCK } from './clock.tokens';
import { SystemClockService } from './clock.service';

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClockService }],
  exports: [CLOCK],
})
export class ClockModule {}
