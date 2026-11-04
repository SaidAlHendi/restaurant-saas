'use client';

import { useQuery } from '@tanstack/react-query';

import { authApi } from '@/lib/api-client';

export const ADMIN_ME_KEY = ['admin', 'me'] as const;

/** The signed-in platform admin (GET /v1/admin/me through this app's /api/auth/me). */
export function useAdminMe() {
  return useQuery({ queryKey: ADMIN_ME_KEY, queryFn: authApi.me, staleTime: 60_000 });
}
