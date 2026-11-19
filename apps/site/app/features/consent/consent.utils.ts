export const CONSENT_COOKIE = 'sahtain_consent';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ConsentChoice = 'accepted' | 'rejected';

/** Read the visitor's choice out of a `document.cookie` string. */
export function parseConsent(cookieString: string): ConsentChoice | null {
  for (const part of cookieString.split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === CONSENT_COOKIE && (value === 'accepted' || value === 'rejected')) {
      return value;
    }
  }
  return null;
}

/** First-party cookie that remembers the choice for a year. `Secure` on HTTPS only. */
export function consentCookie(choice: ConsentChoice, secure: boolean): string {
  return `${CONSENT_COOKIE}=${choice}; Max-Age=${String(ONE_YEAR_SECONDS)}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}
