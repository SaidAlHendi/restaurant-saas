import { describe, expect, it } from 'vitest';

import {
  clearLeadSubmittedCookie,
  hasLeadSubmittedCookie,
  leadSubmittedCookie,
} from './lead-cookie.server.js';

const req = (cookie?: string) =>
  new Request('https://getsahtain.com/ar/thanks', cookie ? { headers: { cookie } } : undefined);

describe('lead submitted cookie', () => {
  it('is recognised among other cookies', () => {
    expect(hasLeadSubmittedCookie(req('a=1; sahtain_lead=1; b=2'))).toBe(true);
  });

  it('is absent for a direct visit or a cleared cookie', () => {
    expect(hasLeadSubmittedCookie(req())).toBe(false);
    expect(hasLeadSubmittedCookie(req('sahtain_lead='))).toBe(false);
  });

  it('is short lived and not readable by scripts', () => {
    expect(leadSubmittedCookie()).toMatch(/Max-Age=120.*HttpOnly/);
    expect(clearLeadSubmittedCookie()).toContain('Max-Age=0');
  });
});
