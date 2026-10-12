import { Inject, Logger } from '@nestjs/common';
import { WebSocketGateway, type OnGatewayInit } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { ENV, type Env } from '../../config/config.module';
import { JwtAccessService } from '../auth/jwt.service';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../errors/app-errors';
import { AuthContextService } from '../../modules/identity/auth-context.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authField(auth: unknown, key: string): unknown {
  if (typeof auth !== 'object' || auth === null) {
    return undefined;
  }
  return Reflect.get(auth, key);
}

@WebSocketGateway({ namespace: '/rt' })
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtAccessService,
    private readonly authContext: AuthContextService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticateHandshake(socket)
        .then(() => {
          next();
        })
        .catch((err: unknown) => {
          next(this.toConnectError(err));
        });
    });
  }

  private async authenticateHandshake(socket: Socket): Promise<void> {
    this.assertOriginAllowed(socket);

    const handshakeAuth: unknown = socket.handshake.auth;
    const tokenRaw = authField(handshakeAuth, 'token');
    const branchIdRaw = authField(handshakeAuth, 'branchId');
    if (typeof tokenRaw !== 'string' || tokenRaw.length === 0) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Missing access token');
    }
    if (typeof branchIdRaw !== 'string' || !UUID_RE.test(branchIdRaw)) {
      throw new ValidationError('Invalid branchId');
    }

    const payload = this.jwt.verify(tokenRaw);
    const ctx = await this.authContext.buildFromAccessToken(payload, undefined);

    if (!ctx.permissions.includes('orders.read')) {
      throw new ForbiddenError('Insufficient permission', {}, 'FORBIDDEN');
    }
    if (!ctx.branchIds.includes(branchIdRaw)) {
      throw new ForbiddenError('Branch is not in scope', {}, 'FORBIDDEN');
    }

    await socket.join(`branch:${branchIdRaw}`);
  }

  private assertOriginAllowed(socket: Socket): void {
    const raw = this.env.CORS_ORIGINS;
    if (raw === undefined || raw.length === 0) {
      return;
    }
    const allowed = raw.split(',').map((entry) => entry.trim());
    const origin = socket.handshake.headers.origin;
    if (typeof origin === 'string' && !allowed.includes(origin)) {
      throw new ForbiddenError('Origin not allowed', {}, 'FORBIDDEN');
    }
  }

  private toConnectError(err: unknown): Error {
    if (err instanceof UnauthorizedError) {
      return new Error('UNAUTHORIZED');
    }
    if (err instanceof ForbiddenError) {
      return new Error('FORBIDDEN');
    }
    if (err instanceof ValidationError) {
      return new Error('UNAUTHORIZED');
    }
    this.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'socket auth failed');
    return new Error('UNAUTHORIZED');
  }
}
