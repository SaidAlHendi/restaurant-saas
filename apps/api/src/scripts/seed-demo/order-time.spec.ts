import { dateAtLocalTime } from './order-time';

function localWallTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

describe('dateAtLocalTime', () => {
  it.each([
    ['2026-09-12', 9, 15, 'Asia/Riyadh', '2026-09-12T06:15:00.000Z'],
    ['2026-09-12', 21, 0, 'Asia/Riyadh', '2026-09-12T18:00:00.000Z'],
    ['2026-09-12', 23, 30, 'Asia/Riyadh', '2026-09-12T20:30:00.000Z'],
    ['2026-09-12', 0, 30, 'Asia/Riyadh', '2026-09-11T21:30:00.000Z'],
    ['2026-09-30', 22, 0, 'Asia/Riyadh', '2026-09-30T19:00:00.000Z'],
    ['2026-12-31', 23, 59, 'Asia/Riyadh', '2026-12-31T20:59:00.000Z'],
    ['2026-03-29', 12, 0, 'Europe/Berlin', '2026-03-29T10:00:00.000Z'],
    ['2026-10-25', 12, 0, 'Europe/Berlin', '2026-10-25T11:00:00.000Z'],
  ])('%s %d:%d in %s', (businessDate, hour, minute, timeZone, expectedIso) => {
    const result = dateAtLocalTime(businessDate, hour, minute, timeZone);
    expect(result.toISOString()).toBe(expectedIso);
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    expect(localWallTime(result, timeZone)).toBe(`${businessDate} ${hh}:${mm}`);
  });
});
