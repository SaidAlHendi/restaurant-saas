import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestContext } from './request-context';

/** Stub @Ctx() — wired when AuthGuard is registered on routes. */
export const Ctx = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): RequestContext | undefined => undefined,
);
