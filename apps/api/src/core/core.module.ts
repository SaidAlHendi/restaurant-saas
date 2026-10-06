import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';

import { ConfigModule } from '../config/config.module';
import { DbModule } from './db/db.module';
import { HttpExceptionFilter } from './errors/http-exception.filter';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ZodValidationPipe } from './validation/zod-validation.pipe';

@Module({
  imports: [ConfigModule, LoggingModule, DbModule, RedisModule, RealtimeModule],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class CoreModule {}
