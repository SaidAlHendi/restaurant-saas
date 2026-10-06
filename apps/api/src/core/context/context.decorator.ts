import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { REQUEST_CONTEXT_KEY, type RequestContext } from './request-context';

export const Ctx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<{ [REQUEST_CONTEXT_KEY]?: RequestContext }>();
    const context = request[REQUEST_CONTEXT_KEY];
    if (!context) {
      throw new Error('RequestContext missing — AuthGuard must run first');
    }
    return context;
  },
);
