import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { ENV, type Env } from '../../config/config.module';

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
        },
      }),
    }),
  ],
})
export class LoggingModule {}
