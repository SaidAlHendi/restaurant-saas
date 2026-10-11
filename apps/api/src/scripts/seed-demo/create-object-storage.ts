import path from 'node:path';

import type { Env } from '../../config/env';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { LocalObjectStorage } from '../../core/storage/local-object-storage';
import { S3ObjectStorage } from '../../core/storage/s3-object-storage';

export function createObjectStorageFromEnv(env: Env): ObjectStorage {
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
    env.STORAGE_PUBLIC_BASE_URL ?? `http://localhost:${String(env.PORT)}/v1/media`;
  return new LocalObjectStorage(root, base);
}
