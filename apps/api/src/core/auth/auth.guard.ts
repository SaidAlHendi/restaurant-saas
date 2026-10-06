import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

/** Stub — not registered in item 1. Fails closed if wired by mistake. */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}
