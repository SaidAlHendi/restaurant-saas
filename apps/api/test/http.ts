import type { Server } from 'node:http';

import request, { type Agent } from 'supertest';
import type { INestApplication } from '@nestjs/common';

export function apiAgent(app: INestApplication): Agent {
  return request.agent(app.getHttpServer() as Server);
}

export function withBearer(agent: Agent, token: string): Agent {
  return agent.set('Authorization', `Bearer ${token}`);
}

export function withBranch(agent: Agent, branchId: string): Agent {
  return agent.set('X-Branch-Id', branchId);
}
