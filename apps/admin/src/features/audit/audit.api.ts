import {
  adminAuditListResponseSchema,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAudit: builder.query<AdminAuditListResponse, AdminAuditListQuery>({
      query: ({ actor, action, cursor }) => ({
        url: '/v1/admin/audit',
        params: { actor: actor || undefined, action: action || undefined, cursor },
      }),
      transformResponse: (response: unknown) => adminAuditListResponseSchema.parse(response),
    }),
  }),
});

export const { useListAuditQuery } = auditApi;
