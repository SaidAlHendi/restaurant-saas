import { Inject, Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { ValidationError } from '../../core/errors/app-errors';
import {
  IMAGE_WIDTHS,
  imageObjectKey,
  type ObjectStorage,
} from '../../core/storage/object-storage';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { newUuidV7 } from '../../lib/uuid';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

@Injectable()
export class ProductImageService {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  assertFileSize(size: number): void {
    if (size > MAX_BYTES) {
      throw new ValidationError('File exceeds maximum size', { maxBytes: MAX_BYTES }, 'FILE_TOO_LARGE');
    }
  }

  async processAndUpload(
    orgId: string,
    productId: string,
    buffer: Buffer,
  ): Promise<{ prefix: string; keys: string[] }> {
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
    } catch {
      throw new ValidationError('Unsupported image format');
    }
    const rawFormat: unknown = meta.format;
    if (typeof rawFormat !== 'string' || !ALLOWED_FORMATS.has(rawFormat)) {
      throw new ValidationError('Unsupported image format');
    }
    if (meta.pages !== undefined && meta.pages > 1) {
      throw new ValidationError('Animated images are not supported');
    }

    const prefix = `orgs/${orgId}/products/${productId}/${newUuidV7()}`;
    const keys: string[] = [];
    const pipeline = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();

    for (const width of IMAGE_WIDTHS) {
      const key = imageObjectKey(prefix, width);
      const out = await pipeline
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp()
        .toBuffer();
      await this.storage.put(key, out, 'image/webp');
      keys.push(key);
    }

    return { prefix, keys };
  }

  async deletePrefix(prefix: string): Promise<void> {
    await Promise.all(
      IMAGE_WIDTHS.map((width) => this.storage.delete(imageObjectKey(prefix, width))),
    );
  }
}
