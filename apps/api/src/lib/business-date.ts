export type BusinessDateInput = {
  now: Date;
  timezone: string;
  dayStartHour: number;
};

/**
 * business_date = date((now at time zone branch.timezone) - make_interval(hours => day_start_hour))
 */
export function computeBusinessDate(input: BusinessDateInput): string {
  const { now, timezone, dayStartHour } = input;
  if (dayStartHour < 0 || dayStartHour > 23) {
    throw new Error('dayStartHour must be between 0 and 23');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const pick = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Missing ${type} for timezone ${timezone}`);
    }
    return Number(part.value);
  };

  let year = pick('year');
  let month = pick('month');
  let day = pick('day');
  let hour = pick('hour');
  if (hour === 24) {
    hour = 0;
  }

  if (hour < dayStartHour) {
    const utcMidnight = Date.UTC(year, month - 1, day);
    const prev = new Date(utcMidnight - 86_400_000);
    year = prev.getUTCFullYear();
    month = prev.getUTCMonth() + 1;
    day = prev.getUTCDate();
  }

  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${String(year)}-${monthStr}-${dayStr}`;
}
