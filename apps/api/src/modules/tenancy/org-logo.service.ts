import { Inject, Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { ValidationError } from '../../core/errors/app-errors';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import { newUuidV7 } from '../../lib/uuid';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const LOGO_WIDTHS = [256, 512] as const;
/** Menu hero cover: portrait 4:5 so the arch crop on the public menu keeps the subject. */
const COVER_WIDTHS = [480, 960] as const;
const COVER_ASPECT = 5 / 4;
/** Smaller uploads would be stretched to 960 px wide and look blurry. */
const COVER_MIN_WIDTH = 480;
const COVER_MIN_HEIGHT = 600;

function logoObjectKey(prefix: string, width: (typeof LOGO_WIDTHS)[number]): string {
  return `${prefix}-${String(width)}.webp`;
}

function coverObjectKey(prefix: string, width: (typeof COVER_WIDTHS)[number]): string {
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

  private async assertSupportedImage(buffer: Buffer): Promise<sharp.Metadata> {
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
    return meta;
  }

  async processAndUpload(orgId: string, buffer: Buffer): Promise<{ prefix: string; primaryKey: string }> {
    await this.assertSupportedImage(buffer);
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

  async processAndUploadCover(orgId: string, buffer: Buffer): Promise<{ primaryKey: string }> {
    const meta = await this.assertSupportedImage(buffer);
    // EXIF orientations 5 to 8 swap width and height once the image is rotated upright.
    const swapped = (meta.orientation ?? 1) >= 5;
    const width = (swapped ? meta.height : meta.width) ?? 0;
    const height = (swapped ? meta.width : meta.height) ?? 0;
    if (width < COVER_MIN_WIDTH || height < COVER_MIN_HEIGHT) {
      throw new ValidationError(
        'Cover image is too small',
        { minWidth: COVER_MIN_WIDTH, minHeight: COVER_MIN_HEIGHT },
        'IMAGE_TOO_SMALL',
      );
    }
    const prefix = `orgs/${orgId}/menu-cover/${newUuidV7()}`;
    const pipeline = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
    const written: string[] = [];
    try {
      for (const width of COVER_WIDTHS) {
        // No `withoutEnlargement`: sharp then skips resizing small images and keeps their own
        // aspect ratio, but the hero crop relies on every size being exactly 4:5.
        const out = await pipeline
          .clone()
          .resize({ width, height: Math.round(width * COVER_ASPECT), fit: 'cover' })
          .webp()
          .toBuffer();
        const key = coverObjectKey(prefix, width);
        await this.storage.put(key, out, 'image/webp');
        written.push(key);
      }
    } catch (err: unknown) {
      // Do not leave half a set of sizes behind.
      await Promise.allSettled(written.map((key) => this.storage.delete(key)));
      throw err;
    }
    return { primaryKey: coverObjectKey(prefix, COVER_WIDTHS[1]) };
  }

  async deleteCoverKeys(coverKey: string | null | undefined): Promise<void> {
    if (!coverKey) {
      return;
    }
    const prefix = coverKey.replace(/-960\.webp$/, '');
    await Promise.all(COVER_WIDTHS.map((width) => this.storage.delete(coverObjectKey(prefix, width))));
  }
}
