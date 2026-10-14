import { z } from 'zod';

import { entitlementsSnapshotSchema } from '../billing/entitlements.js';
import { orgLocaleCodeSchema } from '../i18n/org-locales.js';

export const meResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email().nullable(),
    name: z.string(),
    locale: z.enum(['ar', 'en']),
  }),
  org: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    defaultLocale: orgLocaleCodeSchema,
    locales: z.array(orgLocaleCodeSchema).min(1),
    defaultCurrency: z.string().length(3),
    logoUrl: z.url().nullable(),
  }),
  role: z.object({
    id: z.uuid(),
    key: z.string(),
    name: z.string(),
  }),
  permissions: z.array(z.string()),
  branches: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
      isActive: z.boolean(),
    }),
  ),
  orgs: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  currentBranchId: z.uuid().nullable(),
  entitlements: entitlementsSnapshotSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;
