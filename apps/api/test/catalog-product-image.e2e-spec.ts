import fs from 'node:fs';
import path from 'node:path';

import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import sharp from 'sharp';

import { apiAgent } from './http';
import { createTestApp } from './create-test-app';
import { asDemoOwner, categoryBody, productBody } from './catalog-helpers';

describe('Catalog product images (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProduct(owner: Agent) {
    const cat = await owner.post('/v1/categories').send(categoryBody('Photo', 'صور'));
    const categoryId = (cat.body as { id: string }).id;
    const product = await owner.post('/v1/products').send(productBody(categoryId));
    return (product.body as { id: string }).id;
  }

  it('rejects non-image bytes', async () => {
    const owner = await asDemoOwner(agent);
    const productId = await createProduct(owner);
    const res = await owner
      .post(`/v1/products/${productId}/image`)
      .attach('file', Buffer.from('not an image'), { filename: 'fake.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('accepts jpeg, produces webp variants without exif', async () => {
    const owner = await asDemoOwner(agent);
    const productId = await createProduct(owner);
    const jpeg = await sharp({
      create: { width: 2000, height: 1200, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toBuffer();

    const res = await owner
      .post(`/v1/products/${productId}/image`)
      .attach('file', jpeg, { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    const body = res.body as { imageUrls: { url400: string } | null };
    expect(body.imageUrls).not.toBeNull();

    const storageRoot = path.join(process.cwd(), '.storage', 'orgs');
    const walk = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
      });
    };
    const webpPath = walk(storageRoot).find((f) => f.endsWith('-400.webp'));
    expect(webpPath).toBeDefined();
    const fullPath = webpPath ?? '';
    const meta = await sharp(fullPath).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });

  it('returns FILE_TOO_LARGE over 5MB', async () => {
    const owner = await asDemoOwner(agent);
    const productId = await createProduct(owner);
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const res = await owner
      .post(`/v1/products/${productId}/image`)
      .attach('file', big, { filename: 'big.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    const code = (res.body as { error?: { code: string } }).error?.code;
    expect(code).toBe('FILE_TOO_LARGE');
  });
});
