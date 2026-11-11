import { describe, expect, it } from 'vitest';

import { FACEBOOK_PLACEHOLDER_URL, INSTAGRAM_PLACEHOLDER_URL } from './brand.js';
import { parseSocialLinks } from './social.js';

describe('parseSocialLinks', () => {
  it('uses the configured https links', () => {
    expect(
      parseSocialLinks({
        instagram: 'https://www.instagram.com/mybrand/',
        facebook: ' https://www.facebook.com/mybrand ',
      }),
    ).toEqual({
      instagram: 'https://www.instagram.com/mybrand/',
      facebook: 'https://www.facebook.com/mybrand',
    });
  });

  it('falls back to the placeholders when unset or unsafe', () => {
    expect(parseSocialLinks({})).toEqual({
      instagram: INSTAGRAM_PLACEHOLDER_URL,
      facebook: FACEBOOK_PLACEHOLDER_URL,
    });
    expect(parseSocialLinks({ instagram: 'javascript:alert(1)', facebook: 'not a url' })).toEqual({
      instagram: INSTAGRAM_PLACEHOLDER_URL,
      facebook: FACEBOOK_PLACEHOLDER_URL,
    });
  });
});
