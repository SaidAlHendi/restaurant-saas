import {
  adminAuditListResponseSchema,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export type AuditListArgs = Pick<AdminAuditListQuery, 'actor' | 'action' | 'page'>;

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAudit: builder.query<AdminAuditListResponse, AuditListArgs>({
      query: ({ actor, action, page }) => ({
        url: '/v1/admin/audit',
        params: { actor: actor || undefined, action: action || undefined, page },
      }),
      transformResponse: (response: unknown) => adminAuditListResponseSchema.parse(response),
    }),
  }),
});

export const { useListAuditQuery } = auditApi;
