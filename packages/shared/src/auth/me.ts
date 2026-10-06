import { z } from 'zod';

export const meResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
    locale: z.enum(['ar', 'en']),
  }),
  org: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
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
});

export type MeResponse = z.infer<typeof meResponseSchema>;
