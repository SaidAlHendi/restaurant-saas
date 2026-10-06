import type { Agent } from 'supertest';

import { loadEnv } from '../src/config/env';
import { withBearer } from './http';

export const SEED_ORG = {
  demo: { id: '00000000-0000-4000-8000-000000000201', slug: 'demo' },
  other: { id: '00000000-0000-4000-8000-000000000202', slug: 'other' },
} as const;

export function seedPassword(): string {
  const fromEnv = loadEnv().SEED_PASSWORD;
  return fromEnv ?? 'seed-password-123456';
}

type LoginResponse = { accessToken: string };

export async function loginSeedUser(
  agent: Agent,
  role: 'owner' | 'manager' | 'cashier' | 'kitchen',
  orgSlug: 'demo' | 'other',
): Promise<{ accessToken: string }> {
  const email = `${role}@${orgSlug}.local`;
  const res = await agent.post('/v1/auth/login').send({
    email,
    password: seedPassword(),
  });
  if (![200, 201].includes(res.status)) {
    throw new Error(`login failed ${String(res.status)}: ${JSON.stringify(res.body)}`);
  }
  return res.body as LoginResponse;
}

export function authAgent(agent: Agent, accessToken: string): Agent {
  return withBearer(agent, accessToken);
}
