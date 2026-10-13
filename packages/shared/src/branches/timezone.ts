const COMMON_IANA_TIMEZONES = new Set(
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : [],
);

export function isValidIanaTimezone(zone: string): boolean {
  if (zone.length === 0 || zone.length > 64) {
    return false;
  }
  if (COMMON_IANA_TIMEZONES.size > 0) {
    return COMMON_IANA_TIMEZONES.has(zone);
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
