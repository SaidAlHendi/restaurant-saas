import { z } from 'zod';

export const signupBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  password: z.string().min(10).max(128),
  restaurantName: z.string().trim().min(1).max(200),
  country: z.string().length(2).toUpperCase(),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().length(3).toUpperCase(),
  defaultLocale: z.enum(['ar', 'en']),
});

export type SignupBody = z.infer<typeof signupBodySchema>;

export const signupResponseSchema = z.object({
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
  branch: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
  }),
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;
