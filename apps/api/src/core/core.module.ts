import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

import { ConfigModule, ENV, type Env } from '../config/config.module';
import { IdentityModule } from '../modules/identity/identity.module';

import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { DatabaseRoleValidator } from './db/database-role.validator';
import { DbModule } from './db/db.module';
import { HttpExceptionFilter } from './errors/http-exception.filter';
import { LoggingModule } from './logging/logging.module';
import { PermissionsGuard } from './permissions/permissions.guard';
import { RedisModule, REDIS } from './redis/redis.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';
import { TestThrottlerGuard } from './throttling/test-throttler.guard';
import { ZodValidationPipe } from './validation/zod-validation.pipe';
import { ClockModule } from './clock/clock.module';
import { OutboxService } from './outbox/outbox.service';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DbModule,
    ClockModule,
    StorageModule,
    RedisModule,
    RealtimeModule,
    AuthModule,
    IdentityModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV, REDIS],
      useFactory: (env: Env, redis: Redis) => ({
        throttlers: [{ limit: 100, ttl: 60_000 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  providers: [
    OutboxService,
    DatabaseRoleValidator,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: TestThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [OutboxService],
})
export class CoreModule {}
