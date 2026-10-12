import { describe, expect, it } from 'vitest';

import { dailyReportQuerySchema } from './daily-report.js';

describe('dailyReportQuerySchema', () => {
  it('rejects invalid businessDate', () => {
    expect(dailyReportQuerySchema.safeParse({ businessDate: '2026-13-01' }).success).toBe(false);
  });

  it('accepts valid businessDate', () => {
    expect(dailyReportQuerySchema.safeParse({ businessDate: '2028-02-29' }).success).toBe(true);
  });
});
