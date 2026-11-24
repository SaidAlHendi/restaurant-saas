import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, tap } from 'rxjs';

import { EntitlementsService } from '../../modules/billing/entitlements.service';
import { REQUEST_CONTEXT_KEY, type RequestContext } from '../context/request-context';

import { DataChangedNotifier } from './data-changed.notifier';
import { NOTIFY_CHANGE_KEY, type NotifyChangeOptions } from './notify-change.decorator';
import { RealtimeKickService } from './realtime-kick.service';

type Req = { [REQUEST_CONTEXT_KEY]?: RequestContext; params?: Record<string, string> };

@Injectable()
export class NotifyChangeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly notifier: DataChangedNotifier,
    private readonly kick: RealtimeKickService,
    private readonly entitlements: EntitlementsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.get<NotifyChangeOptions | undefined>(NOTIFY_CHANGE_KEY, context.getHandler());
    if (!opts) return next.handle();
    const req = context.switchToHttp().getRequest<Req>();
    return next.handle().pipe(
      tap(() => {
        const orgId = opts.org === 'param:id' ? req.params?.['id'] : req[REQUEST_CONTEXT_KEY]?.orgId;
        if (!orgId) return;
        if (opts.scope === 'plan') this.entitlements.invalidate(orgId);
        if (opts.kick) {
          this.entitlements.invalidate(orgId);
          this.kick.disconnectOrg(orgId);
          return;
        }
        void this.notifier.notify(orgId, opts.scope);
      }),
    );
  }
}
