import type { INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import type { JwtAccessService } from '../src/core/auth/jwt.service';

import { apiAgent, withBearer, withBranch } from './http';
import { extractInviteToken, signupFreshOrg } from './staff-settings-helpers';
import { postOrder, postPayment } from './ordering-helpers';
import { newUuidV7 } from '../src/lib/uuid';
import type { FreshOrg } from './staff-settings-helpers';

export type StaffPins = {
  owner: FreshOrg;
  managerMembershipId: string;
  managerEmail: string;
  managerPin: string;
  managerToken: string;
  cashierToken: string;
  cashierMembershipId: string;
  cashierPin: string;
  kitchenToken: string;
  branchId: string;
  productId: string;
};

export async function setupFreshOrgWithPins(
  app: INestApplication,
  jwt: JwtAccessService,
): Promise<StaffPins> {
  const appAgent = apiAgent(app);
  const owner = await signupFreshOrg(app, jwt);
  const managerEmail = `mgr-${newUuidV7().slice(-8)}@example.com`;
  const cashierEmail = `csh-${newUuidV7().slice(-8)}@example.com`;
  const kitchenEmail = `kit-${newUuidV7().slice(-8)}@example.com`;

  const managerPin = '2222';
  const cashierPin = '3333';

  for (const [email, roleKey] of [
    [managerEmail, 'manager'],
    [cashierEmail, 'cashier'],
    [kitchenEmail, 'kitchen'],
  ] as const) {
    const inv = await owner.ownerAgent.post('/v1/staff/invites').send({
      email,
      roleKey,
      allBranches: true,
      branchIds: [],
    });
    const token = extractInviteToken((inv.body as { inviteUrl: string }).inviteUrl);
    await appAgent.post('/v1/auth/accept-invite').send({
      token,
      password: owner.password,
    });
  }

  const staff = (await owner.ownerAgent.get('/v1/staff')).body as {
    items: Array<{ email: string | null; id: string; roleKey: string }>;
  };

  const managerRow = staff.items.find((i) => i.email === managerEmail);
  const cashierRow = staff.items.find((i) => i.email === cashierEmail);
  const kitchenRow = staff.items.find((i) => i.email === kitchenEmail);

  await owner.ownerAgent.put(`/v1/staff/${managerRow?.id ?? ''}/pin`).send({ pin: managerPin });
  await owner.ownerAgent.put(`/v1/staff/${cashierRow?.id ?? ''}/pin`).send({ pin: cashierPin });
  await owner.ownerAgent.put(`/v1/staff/${kitchenRow?.id ?? ''}/pin`).send({ pin: '5555' });

  const managerLogin = await appAgent.post('/v1/auth/login').send({
    email: managerEmail,
    password: owner.password,
  });
  const cashierLogin = await appAgent.post('/v1/auth/login').send({
    email: cashierEmail,
    password: owner.password,
  });
  const kitchenLogin = await appAgent.post('/v1/auth/login').send({
    email: kitchenEmail,
    password: owner.password,
  });

  const cat = await owner.ownerAgent.post('/v1/categories').send({
    name: { en: 'Mains' },
    isActive: true,
  });
  if (cat.status !== 201) {
    throw new Error(`category create failed ${String(cat.status)}: ${JSON.stringify(cat.body)}`);
  }
  const categoryId = (cat.body as { id: string }).id;
  const prod = await owner.ownerAgent.post('/v1/products').send({
    categoryId,
    name: { en: 'Burger' },
    description: { en: 'Tasty' },
    priceMinor: 2500,
    isActive: true,
  });
  if (prod.status !== 201) {
    throw new Error(`product create failed ${String(prod.status)}: ${JSON.stringify(prod.body)}`);
  }
  const productId = (prod.body as { id: string }).id;

  return {
    owner,
    managerMembershipId: managerRow?.id ?? '',
    managerEmail,
    managerPin,
    managerToken: (managerLogin.body as { accessToken: string }).accessToken,
    cashierToken: (cashierLogin.body as { accessToken: string }).accessToken,
    cashierMembershipId: cashierRow?.id ?? '',
    cashierPin,
    kitchenToken: (kitchenLogin.body as { accessToken: string }).accessToken,
    branchId: owner.branchId,
    productId,
  };
}

export async function advanceOrderToPreparing(
  client: Agent,
  branchId: string,
  orderId: string,
  expectedVersion: number,
): Promise<number> {
  const res = await client.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
    to: 'preparing',
    expectedVersion,
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`advance to preparing failed ${String(res.status)}: ${JSON.stringify(res.body)}`);
  }
  return (res.body as { version: number }).version;
}

export async function placePlacedOrder(
  client: Agent,
  branchId: string,
  productId: string,
): Promise<{ orderId: string; version: number }> {
  const clientOrderId = newUuidV7();
  const res = await postOrder(
    client,
    branchId,
    {
      clientOrderId,
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    },
    clientOrderId,
  );
  if (res.status !== 201) {
    throw new Error(`postOrder failed ${String(res.status)}: ${JSON.stringify(res.body)}`);
  }
  let order = res.body as {
    id: string;
    version: number;
    status: string;
    dueMinor: number;
  };
  if (order.status === 'draft') {
    const clientPaymentId = newUuidV7();
    const paid = await postPayment(
      client,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'cash',
        amountMinor: order.dueMinor,
        tenderedMinor: order.dueMinor,
      },
      clientPaymentId,
    );
    if (paid.status !== 201 && paid.status !== 200) {
      throw new Error(`postPayment failed ${String(paid.status)}: ${JSON.stringify(paid.body)}`);
    }
    const detail = await client.get(`/v1/branches/${branchId}/orders/${order.id}`);
    if (detail.status !== 200) {
      throw new Error(`get order failed ${String(detail.status)}: ${JSON.stringify(detail.body)}`);
    }
    order = detail.body as typeof order;
  }
  if (order.status !== 'placed') {
    throw new Error(`expected placed order, got ${order.status}`);
  }
  return { orderId: order.id, version: order.version };
}

export function branchAgent(app: INestApplication, token: string, branchId: string): Agent {
  return withBranch(withBearer(apiAgent(app), token), branchId);
}
