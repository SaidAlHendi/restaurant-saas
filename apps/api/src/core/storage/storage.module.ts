import path from 'node:path';

import { Global, Module } from '@nestjs/common';

import { ENV, type Env } from '../../config/config.module';

import type { ObjectStorage } from './object-storage';
import { LocalObjectStorage } from './local-object-storage';
import { OBJECT_STORAGE } from './storage.tokens';
import { S3ObjectStorage } from './s3-object-storage';

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ENV],
      useFactory: (env: Env): ObjectStorage => {
        if (env.STORAGE_DRIVER === 's3') {
          const endpoint = env.S3_ENDPOINT;
          const region = env.S3_REGION;
          const bucket = env.S3_BUCKET;
          const accessKeyId = env.S3_ACCESS_KEY_ID;
          const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
          const publicBaseUrl = env.S3_PUBLIC_BASE_URL;
          if (
            !endpoint ||
            !region ||
            !bucket ||
            !accessKeyId ||
            !secretAccessKey ||
            !publicBaseUrl
          ) {
            throw new Error('S3 storage env vars are incomplete');
          }
          return new S3ObjectStorage({
            endpoint,
            region,
            bucket,
            accessKeyId,
            secretAccessKey,
            publicBaseUrl,
          });
        }
        const root = env.STORAGE_LOCAL_ROOT ?? path.join(process.cwd(), '.storage');
        const base =
          env.STORAGE_PUBLIC_BASE_URL ??
          `http://localhost:${String(env.PORT)}/v1/media`;
        return new LocalObjectStorage(root, base);
      },
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
