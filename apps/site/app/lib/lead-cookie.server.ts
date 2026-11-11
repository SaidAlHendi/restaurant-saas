/**
 * One-shot cookie that proves the visitor just submitted the contact form, so the thank-you page
 * counts a conversion only after a real submit and not when someone opens the URL directly.
 */
const COOKIE_NAME = 'sahtain_lead';
const MAX_AGE_SECONDS = 120;

export function leadSubmittedCookie(): string {
  return `${COOKIE_NAME}=1; Path=/; Max-Age=${String(MAX_AGE_SECONDS)}; HttpOnly; SameSite=Lax; Secure`;
}

export function clearLeadSubmittedCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;
}

export function hasLeadSubmittedCookie(request: Request): boolean {
  const header = request.headers.get('cookie') ?? '';
  return header.split(';').some((part) => part.trim() === `${COOKIE_NAME}=1`);
}
