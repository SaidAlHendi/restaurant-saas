import type { INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import type { SignupResponse } from '@app/shared';

import { JwtAccessService } from '../src/core/auth/jwt.service';
import { newUuidV7 } from '../src/lib/uuid';
import { apiAgent, withBearer } from './http';

export type FreshOrg = {
  ownerToken: string;
  ownerAgent: Agent;
  orgId: string;
  branchId: string;
  ownerEmail: string;
  password: string;
};

export async function signupFreshOrg(
  app: INestApplication,
  jwt: JwtAccessService,
  password = 'password-1234567',
): Promise<FreshOrg> {
  const agent = apiAgent(app);
  const suffix = newUuidV7().slice(-8);
  const ownerEmail = `owner-${suffix}@example.com`;
  const res = await agent.post('/v1/auth/signup').send({
    name: 'Fresh Owner',
    email: ownerEmail,
    password,
    restaurantName: `Fresh ${suffix}`,
    country: 'SA',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    defaultLocale: 'en',
  });
  if (![200, 201].includes(res.status)) {
    throw new Error(`signup failed ${String(res.status)}: ${JSON.stringify(res.body)}`);
  }
  const body = res.body as SignupResponse;
  const ownerToken = body.accessToken;
  const orgId = jwt.verify(ownerToken).org;
  const ownerAgent = withBearer(apiAgent(app), ownerToken);
  return {
    ownerToken,
    ownerAgent,
    orgId,
    branchId: body.branch.id,
    ownerEmail,
    password,
  };
}

export function extractInviteToken(inviteUrl: string): string {
  const parts = inviteUrl.split('/invite/');
  const token = parts[1];
  if (!token) {
    throw new Error('Invalid invite URL');
  }
  return token;
}
