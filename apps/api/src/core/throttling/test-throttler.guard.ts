import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** E2e runs many auth requests; skip Redis-backed limits in test. */
@Injectable()
export class TestThrottlerGuard extends ThrottlerGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env['NODE_ENV'] === 'test') {
      return true;
    }
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (process.env['NODE_ENV'] === 'development') {
        console.error('Throttler storage failed; allowing request in development', error);
        return true;
      }
      throw error;
    }
  }
}
