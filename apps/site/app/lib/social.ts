import { FACEBOOK_PLACEHOLDER_URL, INSTAGRAM_PLACEHOLDER_URL } from './brand.js';

export type SocialLinks = { instagram: string; facebook: string };

/** Keep only a well-formed https link; anything else (unset, typo, `javascript:`) falls back to the placeholder. */
export function parseSocialUrl(raw: string | undefined | null, fallback: string): string {
  try {
    const url = new URL((raw ?? '').trim());
    return url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function parseSocialLinks(env: {
  instagram?: string | undefined;
  facebook?: string | undefined;
}): SocialLinks {
  return {
    instagram: parseSocialUrl(env.instagram, INSTAGRAM_PLACEHOLDER_URL),
    facebook: parseSocialUrl(env.facebook, FACEBOOK_PLACEHOLDER_URL),
  };
}
