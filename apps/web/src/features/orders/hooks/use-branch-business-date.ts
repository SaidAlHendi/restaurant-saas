import { useGetDailyReportQuery } from '../../reports/reports.api.js';

export function useBranchBusinessDate(branchId: string | null) {
  const query = useGetDailyReportQuery(
    { branchId: branchId ?? '' },
    { skip: branchId === null || branchId.length === 0 },
  );

  return {
    businessDate: query.data?.businessDate ?? null,
    timezone: query.data?.timezone ?? null,
    currency: query.data?.currency ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
