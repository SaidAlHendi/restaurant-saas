import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { REQUEST_CONTEXT_KEY, type RequestContext } from '../context/request-context';
import { NotFoundError } from '../errors/app-errors';
import { BRANCH_SCOPE_KEY } from './require-branch-scope.decorator';

@Injectable()
export class BranchScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const needsScope = this.reflector.getAllAndOverride<boolean>(BRANCH_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!needsScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { [REQUEST_CONTEXT_KEY]?: RequestContext }>();
    const ctx = request[REQUEST_CONTEXT_KEY];
    if (!ctx) {
      throw new NotFoundError();
    }

    const branchId = request.params['branchId'];
    if (typeof branchId !== 'string' || branchId.length === 0) {
      throw new NotFoundError();
    }

    if (!ctx.branchIds.includes(branchId)) {
      throw new NotFoundError();
    }

    return true;
  }
}
