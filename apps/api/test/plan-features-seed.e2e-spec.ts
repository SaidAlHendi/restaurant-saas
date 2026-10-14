import { eq } from 'drizzle-orm';
import { Test, type TestingModule } from '@nestjs/testing';

import { PLAN_FEATURE_SEED, PLAN_KEYS } from '@app/shared';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { planFeatures, plans } from '../src/core/db/schema/billing';

describe('plan_features seed (e2e)', () => {
  let db: DrizzleDb;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    resetEnvCacheForTests();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('matches shared PLAN_FEATURE_SEED for every plan', async () => {
    for (const planKey of PLAN_KEYS) {
      const planRows = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
      const plan = planRows[0];
      expect(plan).toBeDefined();
      if (!plan) {
        continue;
      }
      const rows = await db
        .select()
        .from(planFeatures)
        .where(eq(planFeatures.planId, plan.id));
      const expected = PLAN_FEATURE_SEED[planKey];
      expect(rows).toHaveLength(expected.length);
      for (const exp of expected) {
        const row = rows.find((r) => r.featureKey === exp.key);
        expect(row).toBeDefined();
        expect(row?.limitValue ?? null).toBe(exp.limitValue);
      }
    }
  });
});
