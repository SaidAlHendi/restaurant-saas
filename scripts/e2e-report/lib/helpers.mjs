import { Client, uuid } from './http.mjs';
import { config } from './config.mjs';

export const fresh = (label) => `${label}-${config.runId}`;
export const email = (label) => `e2e-${label}-${config.runId}@example.com`;

export async function signup(label, extra = {}) {
  const c = new Client();
  const res = await c.post('/v1/auth/signup', {
    name: `E2E ${label}`,
    email: email(label),
    password: config.password,
    restaurantName: `E2E ${label} ${config.runId}`,
    country: 'SA',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    defaultLocale: 'en',
    ...extra,
  });
  return { res, client: res.body?.accessToken ? c.withToken(res.body.accessToken) : c, c };
}

export async function login(emailAddr, password = config.password) {
  const c = new Client();
  const res = await c.post('/v1/auth/login', { email: emailAddr, password });
  return { res, client: res.body?.accessToken ? c.withToken(res.body.accessToken) : c };
}

/** Owner invites a person and the person accepts, returning a logged-in client. */
export async function inviteAndAccept(owner, ctx, roleKey, label) {
  const addr = email(label);
  const inv = await owner.post('/v1/staff/invites', {
    email: addr, name: `E2E ${label}`, roleKey, allBranches: true, branchIds: [],
  });
  if (inv.status !== 201) return { error: inv, email: addr };
  const token = inv.body.inviteUrl.split('/invite/')[1];
  const acc = await new Client().post('/v1/auth/accept-invite', { token, name: `E2E ${label}`, password: config.password });
  if (!acc.body?.accessToken) return { error: acc, email: addr };
  const client = new Client().withToken(acc.body.accessToken).inBranch(ctx.branchId);
  return { client, email: addr, membershipId: inv.body.membershipId, token };
}

/** Body for POST /orders; `type` defaults to takeaway. */
export function orderBody(items, extra = {}) {
  const id = uuid();
  return { clientOrderId: id, type: 'takeaway', items, ...extra };
}

export function createOrder(client, branchId, body) {
  return client.post(`/v1/branches/${branchId}/orders`, body, { headers: { 'Idempotency-Key': body.clientOrderId } });
}

export function payOrder(client, branchId, order, body = {}) {
  const id = uuid();
  const payload = {
    clientPaymentId: id,
    expectedVersion: order.version,
    method: 'cash',
    amountMinor: order.dueMinor ?? order.totalMinor,
    ...body,
  };
  if (payload.method === 'cash' && payload.tenderedMinor === undefined) payload.tenderedMinor = payload.amountMinor;
  return client.post(`/v1/branches/${branchId}/orders/${order.id}/payments`, payload, { headers: { 'Idempotency-Key': id } });
}

export function setStatus(client, branchId, order, to, extra = {}) {
  return client.post(`/v1/branches/${branchId}/orders/${order.id}/status`, { to, expectedVersion: order.version, ...extra });
}

export const getOrder = (client, branchId, id) => client.get(`/v1/branches/${branchId}/orders/${id}`);

/** 1x1 transparent PNG for upload tests. */
export const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export function pngForm(field = 'file') {
  const f = new FormData();
  f.append(field, new Blob([PNG_1x1], { type: 'image/png' }), 'e2e.png');
  return f;
}
