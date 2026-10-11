import fs from 'node:fs/promises';
import path from 'node:path';

import type { Env } from '../../config/env';
import type { DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { ProductImageService } from '../../modules/catalog/product-image.service';
import { CatalogRepository } from '../../modules/catalog/catalog.repository';

import { productGlobalKey } from './data/index';
import type { OrgSeedDefinition } from './data/types';
import { createObjectStorageFromEnv } from './create-object-storage';
import { deterministicUuid } from './random';

const CACHE_DIR = path.join(process.cwd(), '.seed-cache');

export type UnsplashPhotoEntry = {
  productKey: string;
  query: string;
  photoId: string;
  rawUrl: string;
  authorName: string;
  authorUrl: string;
  photoUrl: string;
};

export function unsplashPhotosPath(): string {
  return path.join(process.cwd(), 'src/scripts/seed-demo/data/unsplash-photos.json');
}

function isUnsplashPhotoEntry(item: unknown): item is UnsplashPhotoEntry {
  if (item === null || typeof item !== 'object') {
    return false;
  }
  const record = item as Record<string, unknown>;
  return typeof record['productKey'] === 'string' && typeof record['rawUrl'] === 'string';
}

export async function readUnsplashPhotos(): Promise<UnsplashPhotoEntry[]> {
  const filePath = unsplashPhotosPath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const entries: UnsplashPhotoEntry[] = [];
    for (const item of parsed) {
      if (isUnsplashPhotoEntry(item)) {
        entries.push(item);
      }
    }
    return entries;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function photoByProductKey(entries: UnsplashPhotoEntry[]): Map<string, UnsplashPhotoEntry> {
  const map = new Map<string, UnsplashPhotoEntry>();
  for (const entry of entries) {
    map.set(entry.productKey, entry);
  }
  return map;
}

async function downloadToCache(cacheFile: string, rawUrl: string): Promise<Buffer> {
  try {
    return await fs.readFile(cacheFile);
  } catch (err: unknown) {
    if (!err || typeof err !== 'object' || !('code' in err) || err.code !== 'ENOENT') {
      throw err;
    }
  }
  const url = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}w=1200&q=80&fm=jpg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Image download failed: ${String(res.status)}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, buffer);
  return buffer;
}

export async function seedProductImagesForOrg(
  db: DrizzleDb,
  env: Env,
  definition: OrgSeedDefinition,
  orgId: string,
): Promise<{ uploaded: number; skipped: number; warnings: number }> {
  const photos = photoByProductKey(await readUnsplashPhotos());
  const storage = createObjectStorageFromEnv(env);
  const imageService = new ProductImageService(storage);
  const catalogRepo = new CatalogRepository();

  let uploaded = 0;
  let skipped = 0;
  let warnings = 0;
  let missingPhotos = 0;

  // Read which products still need a photo, then download and process outside any transaction.
  const needsImage = new Set<string>();
  await withOrg(db, orgId, async (tx) => {
    for (const product of definition.products) {
      const productId = deterministicUuid('product', definition.slug, product.key);
      const row = await catalogRepo.findProductById(tx, productId, true);
      if (!row) {
        continue;
      }
      if (row.imageKey) {
        skipped += 1;
      } else {
        needsImage.add(product.key);
      }
    }
  });

  for (const product of definition.products) {
    if (!needsImage.has(product.key)) {
      continue;
    }
    const productId = deterministicUuid('product', definition.slug, product.key);
    const globalKey = productGlobalKey(definition.slug, product.key);
    const photo = photos.get(globalKey);
    if (!photo) {
      missingPhotos += 1;
      continue;
    }

    const cacheFile = path.join(CACHE_DIR, `${globalKey.replace(/:/g, '_')}.jpg`);
    try {
      const buffer = await downloadToCache(cacheFile, photo.rawUrl);
      const processed = await imageService.processAndUpload(orgId, productId, buffer);
      await withOrg(db, orgId, async (tx) => {
        await catalogRepo.updateProduct(tx, productId, { imageKey: processed.prefix });
      });
      uploaded += 1;
    } catch (err: unknown) {
      warnings += 1;
      const message = err instanceof Error ? err.message : 'unknown error';
      process.stderr.write(`[seed-demo] Image skipped for ${globalKey}: ${message}\n`);
    }
  }

  if (missingPhotos > 0) {
    warnings += missingPhotos;
    process.stderr.write(
      `[seed-demo] ${definition.slug}: ${String(missingPhotos)} product(s) have no photo in unsplash-photos.json (run pnpm db:seed:images)\n`,
    );
  }

  return { uploaded, skipped, warnings };
}

export async function seedProductImages(
  db: DrizzleDb,
  env: Env,
  orgs: Array<{ definition: OrgSeedDefinition; id: string }>,
): Promise<void> {
  for (const org of orgs) {
    await seedProductImagesForOrg(db, env, org.definition, org.id);
  }
}
