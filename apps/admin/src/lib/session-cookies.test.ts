import { describe, expect, it } from 'vitest';

import { safeNextPath } from './session-cookies';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/coming-soon?page=users')).toBe('/coming-soon?page=users');
  });
  it('rejects anything that could leave the site', () => {
    expect(safeNextPath('//evil.example')).toBe('/');
    expect(safeNextPath('https://evil.example')).toBe('/');
    expect(safeNextPath('/\\evil.example')).toBe('/');
    expect(safeNextPath(null)).toBe('/');
  });
});
