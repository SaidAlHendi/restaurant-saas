export const ATTRIBUTION_STORAGE_KEY = 'sahtain_attribution';

const TRACKED_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
] as const;

export type Attribution = Partial<Record<(typeof TRACKED_PARAMS)[number], string>> & {
  /** Where the visitor came from (document.referrer), if any. */
  referrer?: string;
  /** The landing path of the first visit, e.g. `/ar`. */
  landingPath?: string;
};

const MAX_VALUE_LENGTH = 200;

/** First-touch attribution from the URL of the first visit. Values are trimmed and length-capped. */
export function parseAttribution(search: string, referrer: string, landingPath: string): Attribution {
  const params = new URLSearchParams(search);
  const result: Attribution = {};
  for (const key of TRACKED_PARAMS) {
    const value = params.get(key)?.trim().slice(0, MAX_VALUE_LENGTH);
    if (value) {
      result[key] = value;
    }
  }
  if (referrer) {
    result.referrer = referrer.slice(0, MAX_VALUE_LENGTH);
  }
  result.landingPath = landingPath.slice(0, MAX_VALUE_LENGTH);
  return result;
}

export function hasCampaignData(attribution: Attribution): boolean {
  return TRACKED_PARAMS.some((key) => attribution[key] !== undefined);
}
