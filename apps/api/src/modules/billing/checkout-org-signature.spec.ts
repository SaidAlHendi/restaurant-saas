import { signCheckoutOrgId, verifyCheckoutOrgId } from './checkout-org-signature';

const SECRET = 'test-secret-min-32-chars-long-xxxxxxxx';
const ORG = '01a1461e-ffdd-7516-bdea-e6d49fd795c4';
const OTHER_ORG = '01a1461e-ffdd-7516-bdea-e6d49fd795c5';

describe('checkout org signature', () => {
  it('accepts its own signature', () => {
    expect(verifyCheckoutOrgId(SECRET, ORG, signCheckoutOrgId(SECRET, ORG))).toBe(true);
  });

  it('rejects a signature made for another org', () => {
    expect(verifyCheckoutOrgId(SECRET, OTHER_ORG, signCheckoutOrgId(SECRET, ORG))).toBe(false);
  });

  it('rejects a missing or malformed signature', () => {
    expect(verifyCheckoutOrgId(SECRET, ORG, undefined)).toBe(false);
    expect(verifyCheckoutOrgId(SECRET, ORG, '')).toBe(false);
    expect(verifyCheckoutOrgId(SECRET, ORG, 'nope')).toBe(false);
  });
});
