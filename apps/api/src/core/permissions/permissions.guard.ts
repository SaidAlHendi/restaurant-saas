import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { IS_AUTHENTICATED_KEY } from '../auth/authenticated.decorator';
import { REQUEST_CONTEXT_KEY, type RequestContext } from '../context/request-context';
import { ForbiddenError } from '../errors/app-errors';
import { FEATURE_KEY } from './require-feature.decorator';
import { PERMISSION_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const permission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isAuthenticated = this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const feature = this.reflector.getAllAndOverride<string | undefined>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permission && !isAuthenticated) {
      throw new ForbiddenError('Endpoint requires permission metadata');
    }

    const request = context.switchToHttp().getRequest<Request & { [REQUEST_CONTEXT_KEY]?: RequestContext }>();
    const ctx = request[REQUEST_CONTEXT_KEY];
    if (!ctx) {
      throw new ForbiddenError('Missing request context');
    }

    if (feature) {
      // Roadmap item 10: entitlement check stub — always allow
    }

    if (permission && !ctx.permissions.includes(permission)) {
      throw new ForbiddenError('Insufficient permission');
    }

    return true;
  }
}
