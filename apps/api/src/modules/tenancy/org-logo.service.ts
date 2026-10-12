import { Inject, Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { ValidationError } from '../../core/errors/app-errors';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { newUuidV7 } from '../../lib/uuid';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const LOGO_WIDTHS = [256, 512] as const;

function logoObjectKey(prefix: string, width: (typeof LOGO_WIDTHS)[number]): string {
  return `${prefix}-${String(width)}.webp`;
}

@Injectable()
export class OrgLogoService {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  assertFileSize(size: number): void {
    if (size > MAX_BYTES) {
      throw new ValidationError('File exceeds maximum size', { maxBytes: MAX_BYTES }, 'FILE_TOO_LARGE');
    }
  }

  async processAndUpload(orgId: string, buffer: Buffer): Promise<{ prefix: string; primaryKey: string }> {
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
    } catch {
      throw new ValidationError('Unsupported image format', {}, 'UNSUPPORTED_IMAGE_TYPE');
    }
    const rawFormat: unknown = meta.format;
    if (typeof rawFormat !== 'string' || !ALLOWED_FORMATS.has(rawFormat)) {
      throw new ValidationError('Unsupported image format', {}, 'UNSUPPORTED_IMAGE_TYPE');
    }
    if (meta.pages !== undefined && meta.pages > 1) {
      throw new ValidationError('Animated images are not supported');
    }

    const prefix = `orgs/${orgId}/logo/${newUuidV7()}`;
    const pipeline = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();

    for (const width of LOGO_WIDTHS) {
      const key = logoObjectKey(prefix, width);
      const out = await pipeline
        .clone()
        .resize({ width, height: width, fit: 'cover', withoutEnlargement: true })
        .webp()
        .toBuffer();
      await this.storage.put(key, out, 'image/webp');
    }

    return { prefix, primaryKey: logoObjectKey(prefix, 512) };
  }

  async deleteLogoKeys(logoKey: string | null | undefined): Promise<void> {
    if (!logoKey) {
      return;
    }
    const prefix = logoKey.replace(/-512\.webp$/, '');
    await Promise.all(
      LOGO_WIDTHS.map((width) => this.storage.delete(logoObjectKey(prefix, width))),
    );
  }
}
