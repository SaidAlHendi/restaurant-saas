import { z } from 'zod';

const siteEnvSchema = z.object({
  PUBLIC_API_URL: z.url(),
  PUBLIC_SITE_URL: z.url(),
});

export type SiteEnv = z.infer<typeof siteEnvSchema>;

let cached: SiteEnv | null = null;

export function getSiteEnv(): SiteEnv {
  if (cached === null) {
    cached = siteEnvSchema.parse({
      PUBLIC_API_URL: process.env.PUBLIC_API_URL,
      PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
    });
  }
  return cached;
}

/** Test-only reset. */
export function resetSiteEnvCacheForTests(): void {
  cached = null;
}
