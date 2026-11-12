import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { ENV, type Env } from '../../config/config.module';
import { REQUEST_CONTEXT_KEY, type RequestContext } from '../context/request-context';

type LoggedReq = { method?: string; originalUrl?: string; url?: string } & Record<string, unknown>;

/** One short line per request: "GET /v1/staff 304 15ms user=0194a1b2". */
function requestLine(req: LoggedReq, statusCode: number, responseTime?: number): string {
  const ctx = req[REQUEST_CONTEXT_KEY] as RequestContext | undefined;
  const who = ctx ? ctx.userId.slice(0, 8) : 'anon';
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
  const ms = responseTime === undefined ? '' : ` ${String(responseTime)}ms`;
  return `${req.method ?? '-'} ${path} ${String(statusCode)}${ms} user=${who}`;
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'pin'],
            remove: true,
          },
          genReqId: (req, res) => {
            const existing = req.headers['x-request-id'];
            const id =
              typeof existing === 'string' && existing.length > 0
                ? existing
                : crypto.randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          customProps: () => ({}),
          customSuccessMessage: (req, res, responseTime) =>
            requestLine(req as unknown as LoggedReq, res.statusCode, responseTime),
          customErrorMessage: (req, res) =>
            requestLine(req as unknown as LoggedReq, res.statusCode),
          // Dev only: human-readable one-liners. Production keeps structured JSON.
          ...(env.NODE_ENV === 'development'
            ? {
                transport: {
                  target: 'pino-pretty',
                  options: {
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname,req,res,responseTime',
                    singleLine: true,
                  },
                },
              }
            : {}),
        },
      }),
    }),
  ],
})
export class LoggingModule {}
