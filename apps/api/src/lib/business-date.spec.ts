import { computeBusinessDate } from './business-date';

describe('computeBusinessDate', () => {
  it('uses same calendar day before day_start_hour', () => {
    const now = new Date('2026-03-15T08:00:00.000Z');
    expect(
      computeBusinessDate({ now, timezone: 'Asia/Riyadh', dayStartHour: 4 }),
    ).toBe('2026-03-15');
  });

  it('rolls back before day_start_hour in branch timezone', () => {
    const now = new Date('2026-03-14T22:00:00.000Z');
    expect(
      computeBusinessDate({ now, timezone: 'Asia/Riyadh', dayStartHour: 4 }),
    ).toBe('2026-03-14');
  });

  it('handles midnight boundary', () => {
    const now = new Date('2026-06-01T21:00:00.000Z');
    expect(
      computeBusinessDate({ now, timezone: 'Asia/Riyadh', dayStartHour: 0 }),
    ).toBe('2026-06-02');
  });

  it('handles DST spring forward in Europe/Berlin', () => {
    const before = new Date('2026-03-29T01:30:00.000Z');
    expect(
      computeBusinessDate({ now: before, timezone: 'Europe/Berlin', dayStartHour: 4 }),
    ).toBe('2026-03-28');
    const after = new Date('2026-03-29T04:30:00.000Z');
    expect(
      computeBusinessDate({ now: after, timezone: 'Europe/Berlin', dayStartHour: 4 }),
    ).toBe('2026-03-29');
  });
});
