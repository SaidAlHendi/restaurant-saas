function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Missing ${type} for ${timeZone}`);
    }
    return Number(part.value);
  };
  const localAsUtc = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour'),
    pick('minute'),
    pick('second'),
  );
  return localAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Map a local wall time in `timeZone` to a UTC `Date`. */
export function dateAtLocalTime(
  businessDate: string,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const segments = businessDate.split('-');
  const y = Number(segments[0]);
  const m = Number(segments[1]);
  const d = Number(segments[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    throw new Error(`Invalid businessDate ${businessDate}`);
  }

  const wallAsUtc = Date.UTC(y, m - 1, d, hour, minute, 0, 0);
  const firstGuess = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  // Re-read the offset at the first guess so DST changes between the two instants are honoured.
  return new Date(wallAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isWeekendBusinessDate(businessDate: string): boolean {
  const segments = businessDate.split('-');
  const y = Number(segments[0]);
  const m = Number(segments[1]);
  const d = Number(segments[2]);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 5 || dow === 6;
}
