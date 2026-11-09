import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner, categoryBody, productBody } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { createIsolatedBranch, postOrder } from './ordering-helpers';

type PosMenu = { categories: Array<{ id: string; products: Array<{ id: string }> }> };
type ProductDto = { id: string; availableInAllBranches: boolean; branchIds: string[] };
type CategoryDto = { id: string; availableInAllBranches: boolean; branchIds: string[] };

describe('Per-branch availability (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup() {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId: branchA } = await createIsolatedBranch(owner);
    const { branchId: branchB } = await createIsolatedBranch(owner);
    const cat = await owner.post('/v1/categories').send(categoryBody());
    const categoryId = (cat.body as CategoryDto).id;
    return { owner, branchA, branchB, categoryId };
  }

  function productIdsOf(menu: PosMenu): string[] {
    return menu.categories.flatMap((c) => c.products.map((p) => p.id));
  }

  it('defaults to all branches and shows the product everywhere', async () => {
    const { owner, branchA, branchB, categoryId } = await setup();
    const created = await owner.post('/v1/products').send(productBody(categoryId));
    expect(created.status).toBe(201);
    const product = created.body as ProductDto;
    expect(product.availableInAllBranches).toBe(true);
    expect(product.branchIds).toEqual([]);

    for (const branchId of [branchA, branchB]) {
      const menu = await owner.get(`/v1/branches/${branchId}/pos/menu`);
      expect(productIdsOf(menu.body as PosMenu)).toContain(product.id);
    }
  });

  it('limits a product to chosen branches and filters list, POS menu and orders', async () => {
    const { owner, branchA, branchB, categoryId } = await setup();
    const created = await owner
      .post('/v1/products')
      .send({ ...productBody(categoryId), availableInAllBranches: false, branchIds: [branchA] });
    expect(created.status).toBe(201);
    const product = created.body as ProductDto;
    expect(product.availableInAllBranches).toBe(false);
    expect(product.branchIds).toEqual([branchA]);

    const menuA = await owner.get(`/v1/branches/${branchA}/pos/menu`);
    const menuB = await owner.get(`/v1/branches/${branchB}/pos/menu`);
    expect(productIdsOf(menuA.body as PosMenu)).toContain(product.id);
    expect(productIdsOf(menuB.body as PosMenu)).not.toContain(product.id);

    const listB = await owner.get(`/v1/products?branchId=${branchB}&categoryId=${categoryId}`);
    const listA = await owner.get(`/v1/products?branchId=${branchA}&categoryId=${categoryId}`);
    expect((listB.body as { items: ProductDto[] }).items.map((p) => p.id)).not.toContain(product.id);
    expect((listA.body as { items: ProductDto[] }).items.map((p) => p.id)).toContain(product.id);

    const order = (branchId: string) => {
      const clientOrderId = newUuidV7();
      return postOrder(
        owner,
        branchId,
        {
          clientOrderId,
          type: 'takeaway',
          items: [{ productId: product.id, quantity: 1, modifierIds: [] }],
        },
        clientOrderId,
      );
    };
    expect((await order(branchB)).status).toBe(422);
    expect((await order(branchA)).status).toBe(201);
  });

  it('changes branches from the product detail and switches back to all', async () => {
    const { owner, branchA, branchB, categoryId } = await setup();
    const created = await owner.post('/v1/products').send(productBody(categoryId));
    const id = (created.body as ProductDto).id;

    const limited = await owner
      .patch(`/v1/products/${id}`)
      .send({ availableInAllBranches: false, branchIds: [branchB] });
    expect(limited.status).toBe(200);
    expect((limited.body as ProductDto).branchIds).toEqual([branchB]);
    const detail = await owner.get(`/v1/products/${id}`);
    expect((detail.body as ProductDto).branchIds).toEqual([branchB]);
    const menuA = await owner.get(`/v1/branches/${branchA}/pos/menu`);
    expect(productIdsOf(menuA.body as PosMenu)).not.toContain(id);

    const all = await owner.patch(`/v1/products/${id}`).send({ availableInAllBranches: true });
    expect(all.status).toBe(200);
    expect((all.body as ProductDto).branchIds).toEqual([]);
    const menuA2 = await owner.get(`/v1/branches/${branchA}/pos/menu`);
    expect(productIdsOf(menuA2.body as PosMenu)).toContain(id);
  });

  it('hides a whole category (and its products) from a branch', async () => {
    const { owner, branchA, branchB, categoryId } = await setup();
    const prod = await owner.post('/v1/products').send(productBody(categoryId));
    const productId = (prod.body as ProductDto).id;

    const patched = await owner
      .patch(`/v1/categories/${categoryId}`)
      .send({ availableInAllBranches: false, branchIds: [branchA] });
    expect(patched.status).toBe(200);
    expect((patched.body as CategoryDto).branchIds).toEqual([branchA]);

    const menuA = await owner.get(`/v1/branches/${branchA}/pos/menu`);
    const menuB = await owner.get(`/v1/branches/${branchB}/pos/menu`);
    expect(productIdsOf(menuA.body as PosMenu)).toContain(productId);
    expect(productIdsOf(menuB.body as PosMenu)).not.toContain(productId);
  });

  it('rejects invalid input', async () => {
    const { owner, categoryId } = await setup();
    const missingList = await owner
      .post('/v1/products')
      .send({ ...productBody(categoryId), availableInAllBranches: false });
    expect(missingList.status).toBe(400);
    const emptyList = await owner
      .post('/v1/products')
      .send({ ...productBody(categoryId), availableInAllBranches: false, branchIds: [] });
    expect(emptyList.status).toBe(400);
    const unknownBranch = await owner.post('/v1/products').send({
      ...productBody(categoryId),
      availableInAllBranches: false,
      branchIds: [randomUUID()],
    });
    expect(unknownBranch.status).toBe(400);
  });
});
