import { Injectable } from '@nestjs/common';

import type { Clock } from './clock.tokens';

@Injectable()
export class SystemClockService implements Clock {
  now(): Date {
    return new Date();
  }
}
