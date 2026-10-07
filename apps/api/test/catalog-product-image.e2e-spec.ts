import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import sharp from 'sharp';

import { SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createTestApp } from './create-test-app';
import {
  asDemoKitchen,
  asDemoOwner,
  asOtherOwner,
  categoryBody,
  productBody,
  webpFilesForProduct,
} from './catalog-helpers';

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

  async function jpegWithGpsExif(): Promise<Buffer> {
    return sharp({
      create: { width: 1600, height: 900, channels: 3, background: '#224466' },
    })
      .jpeg()
      .withExif({
        IFD0: {
          Make: 'TestCam',
        },
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '40/1,30/1,0/1',
          GPSLongitudeRef: 'W',
          GPSLongitude: '74/1,0/1,0/1',
        },
      })
      .toBuffer();
  }

  it('rejects non-image bytes', async () => {
    const owner = await asDemoOwner(agent);
    const productId = await createProduct(owner);
    const res = await owner
      .post(`/v1/products/${productId}/image`)
      .attach('file', Buffer.from('not an image'), { filename: 'fake.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('UNSUPPORTED_IMAGE_TYPE');
  });

  it('strips exif, writes three widths, and deletes old files on replace', async () => {
    const owner = await asDemoOwner(agent);
    const productId = await createProduct(owner);
    const jpeg = await jpegWithGpsExif();
    const inputMeta = await sharp(jpeg).metadata();
    expect(inputMeta.exif).toBeDefined();

    const first = await owner
      .post(`/v1/products/${productId}/image`)
      .attach('file', jpeg, { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(first.status).toBe(201);

    const firstFiles = webpFilesForProduct(SEED_ORG.demo.id, productId);
    expect(firstFiles.some((f) => f.endsWith('-400.webp'))).toBe(true);
    expect(firstFiles.some((f) => f.endsWith('-800.webp'))).toBe(true);
    expect(firstFiles.some((f) => f.endsWith('-1200.webp'))).toBe(true);
    const firstMeta = await sharp(firstFiles.find((f) => f.endsWith('-400.webp')) ?? '').metadata();
    expect(firstMeta.exif).toBeUndefined();

    const jpeg2 = await jpegWithGpsExif();
    const second = await owner
      .post(`/v1/products/${productId}/image`)
      .attach('file', jpeg2, { filename: 'photo2.jpg', contentType: 'image/jpeg' });
    expect(second.status).toBe(201);

    const afterFiles = webpFilesForProduct(SEED_ORG.demo.id, productId);
    expect(afterFiles.length).toBe(3);
    for (const file of firstFiles) {
      expect(afterFiles).not.toContain(file);
    }
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

  it('404 when uploading to another org product', async () => {
    const other = await asOtherOwner(agent);
    const otherProductId = await createProduct(other);
    const demo = await asDemoOwner(agent);
    const jpeg = await jpegWithGpsExif();
    const res = await demo
      .post(`/v1/products/${otherProductId}/image`)
      .attach('file', jpeg, { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });

  it('403 kitchen cannot upload image', async () => {
    const owner = await asDemoOwner(agent);
    const productId = await createProduct(owner);
    const kitchen = await asDemoKitchen(agent);
    const jpeg = await jpegWithGpsExif();
    const res = await kitchen
      .post(`/v1/products/${productId}/image`)
      .attach('file', jpeg, { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(403);
  });
});
