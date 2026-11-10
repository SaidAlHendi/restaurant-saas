import { describe, expect, it } from 'vitest';

import { loader } from './home.js';

function visit(acceptLanguage?: string) {
  const headers = new Headers();
  if (acceptLanguage !== undefined) {
    headers.set('accept-language', acceptLanguage);
  }
  return loader({ request: new Request('https://getsahtain.com/', { headers }) });
}

describe('home redirect', () => {
  it('sends visitors to Arabic by default with a 302', () => {
    const res = visit();
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/ar');
  });

  it('sends English-preferring visitors to /en', () => {
    expect(visit('en-GB,en;q=0.9').headers.get('Location')).toBe('/en');
  });

  it('tells caches the answer depends on Accept-Language', () => {
    expect(visit().headers.get('Vary')).toBe('Accept-Language');
  });
});
