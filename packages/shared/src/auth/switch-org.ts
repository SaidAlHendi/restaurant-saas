import { z } from 'zod';

export const switchOrgBodySchema = z.object({
  orgId: z.uuid(),
});

export type SwitchOrgBody = z.infer<typeof switchOrgBodySchema>;

export const switchOrgResponseSchema = z.object({
  accessToken: z.string(),
  org: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
  }),
});

export type SwitchOrgResponse = z.infer<typeof switchOrgResponseSchema>;
