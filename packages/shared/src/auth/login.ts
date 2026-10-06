import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
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
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
