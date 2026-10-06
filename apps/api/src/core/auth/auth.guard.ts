import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { JwtAccessService } from './jwt.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REQUEST_CONTEXT_KEY } from '../context/request-context';
import { AuthContextService } from '../../modules/identity/auth-context.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtAccessService,
    private readonly authContext: AuthContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }
    const token = header.slice('Bearer '.length);
    let payload;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const branchHeader = request.headers['x-branch-id'];
    const branchId =
      typeof branchHeader === 'string'
        ? branchHeader
        : Array.isArray(branchHeader)
          ? branchHeader[0]
          : undefined;

    const ctx = await this.authContext.buildFromAccessToken(payload, branchId);
    (request as Request & { [REQUEST_CONTEXT_KEY]: typeof ctx })[REQUEST_CONTEXT_KEY] = ctx;
    return true;
  }
}
