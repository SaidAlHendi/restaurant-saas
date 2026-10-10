import { computeBusinessDate } from './business-date';

describe('computeBusinessDate', () => {
  it('uses Asia/Riyadh timezone and day_start_hour for business date rollover', () => {
    const timezone = 'Asia/Riyadh';
    const dayStartHour = 4;

    const beforeStart = new Date('2026-03-15T00:30:00.000Z');
    expect(computeBusinessDate({ now: beforeStart, timezone, dayStartHour })).toBe('2026-03-14');

    const afterStart = new Date('2026-03-15T01:30:00.000Z');
    expect(computeBusinessDate({ now: afterStart, timezone, dayStartHour })).toBe('2026-03-15');
  });
});
