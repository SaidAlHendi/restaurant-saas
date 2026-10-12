import { dailyReportSchema, type DailyReport } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDailyReport: builder.query<
      DailyReport,
      { branchId: string; businessDate?: string }
    >({
      query: ({ branchId, businessDate }) => ({
        url: `/v1/branches/${branchId}/reports/daily`,
        params: businessDate !== undefined ? { businessDate } : {},
      }),
      transformResponse: (response: unknown) => dailyReportSchema.parse(response),
      providesTags: (_result, _error, arg) => [
        {
          type: 'DailyReport' as const,
          id: `${arg.branchId}:${arg.businessDate ?? 'default'}`,
        },
      ],
    }),
  }),
});

export const { useGetDailyReportQuery } = reportsApi;
