/** Cookies that live on the admin app's own origin. The API's own cookie (admin_rt) never reaches it. */
export const ACCESS_COOKIE = 'admin_at';
export const REFRESH_COOKIE = 'admin_rt';
export const REFRESH_COOKIE_PATH = '/api/auth';
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export function cookieSecure(): boolean {
  const flag = process.env.COOKIE_SECURE;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  return process.env.NODE_ENV === 'production';
}

export function apiUrl(): string {
  return (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** Only same-site relative paths, so a login link cannot bounce the user to another site. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}
