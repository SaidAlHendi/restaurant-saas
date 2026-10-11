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

  let utcMs = Date.UTC(y, m - 1, d, hour, minute, 0, 0);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const pick = (type: Intl.DateTimeFormatPartTypes): number => {
      const part = parts.find((p) => p.type === type);
      if (!part) {
        throw new Error(`Missing ${type} for ${timeZone}`);
      }
      return Number(part.value);
    };

    const ly = pick('year');
    const lm = pick('month');
    const ld = pick('day');
    let lh = pick('hour');
    if (lh === 24) {
      lh = 0;
    }
    const lmin = pick('minute');

    if (ly === y && lm === m && ld === d && lh === hour && lmin === minute) {
      return new Date(utcMs);
    }

    const targetLocalMin = hour * 60 + minute;
    const actualLocalMin = lh * 60 + lmin;
    let dayDelta = 0;
    if (ly !== y || lm !== m || ld !== d) {
      dayDelta = (ld < d ? -1 : 1) * 24 * 60;
    }
    utcMs += (targetLocalMin - actualLocalMin + dayDelta) * 60_000;
  }

  return new Date(utcMs);
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
