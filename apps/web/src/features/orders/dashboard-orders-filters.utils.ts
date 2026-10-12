import type { OrderStatus, OrderType, PaymentMethod } from '@app/shared';

export type DashboardOrdersPeriod = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export type DashboardOrdersFilters = {
  q: string;
  status: OrderStatus | 'all';
  type: OrderType | 'all';
  paymentMethod: PaymentMethod | 'all';
  period: DashboardOrdersPeriod;
  dateFrom: string;
  dateTo: string;
};

const ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'placed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'refunded',
];

const ORDER_TYPES: OrderType[] = ['dine_in', 'takeaway'];

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'other'];

const PERIODS: DashboardOrdersPeriod[] = ['today', 'yesterday', 'last7', 'last30', 'custom'];

export function addCalendarDays(businessDate: string, deltaDays: number): string {
  const parsed = Date.parse(`${businessDate}T00:00:00.000Z`);
  const next = new Date(parsed + deltaDays * 86_400_000);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${String(y)}-${m}-${d}`;
}

export function periodToDateRange(
  period: DashboardOrdersPeriod,
  referenceBusinessDate: string,
  customFrom?: string,
  customTo?: string,
): { dateFrom: string; dateTo: string } {
  switch (period) {
    case 'today':
      return { dateFrom: referenceBusinessDate, dateTo: referenceBusinessDate };
    case 'yesterday': {
      const yesterday = addCalendarDays(referenceBusinessDate, -1);
      return { dateFrom: yesterday, dateTo: yesterday };
    }
    case 'last7':
      return { dateFrom: addCalendarDays(referenceBusinessDate, -6), dateTo: referenceBusinessDate };
    case 'last30':
      return { dateFrom: addCalendarDays(referenceBusinessDate, -29), dateTo: referenceBusinessDate };
    case 'custom': {
      const from = customFrom ?? referenceBusinessDate;
      const to = customTo ?? referenceBusinessDate;
      return { dateFrom: from, dateTo: to };
    }
    default:
      return { dateFrom: referenceBusinessDate, dateTo: referenceBusinessDate };
  }
}

function parseStatus(value: string | null): OrderStatus | 'all' {
  if (value === null || value === 'all') {
    return 'all';
  }
  return (ORDER_STATUSES as string[]).includes(value) ? (value as OrderStatus) : 'all';
}

function parseType(value: string | null): OrderType | 'all' {
  if (value === null || value === 'all') {
    return 'all';
  }
  return (ORDER_TYPES as string[]).includes(value) ? (value as OrderType) : 'all';
}

function parsePaymentMethod(value: string | null): PaymentMethod | 'all' {
  if (value === null || value === 'all') {
    return 'all';
  }
  return (PAYMENT_METHODS as string[]).includes(value) ? (value as PaymentMethod) : 'all';
}

function parsePeriod(value: string | null): DashboardOrdersPeriod {
  if (value !== null && (PERIODS as string[]).includes(value)) {
    return value as DashboardOrdersPeriod;
  }
  return 'today';
}

export function parseDashboardOrdersFilters(
  params: URLSearchParams,
  referenceBusinessDate: string,
): DashboardOrdersFilters {
  const period = parsePeriod(params.get('period'));
  const rawFrom = params.get('from') ?? undefined;
  const rawTo = params.get('to') ?? undefined;
  const range = periodToDateRange(period, referenceBusinessDate, rawFrom, rawTo);
  return {
    q: params.get('q') ?? '',
    status: parseStatus(params.get('status')),
    type: parseType(params.get('type')),
    paymentMethod: parsePaymentMethod(params.get('pay')),
    period,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  };
}

export function dashboardOrdersFiltersToSearchParams(
  filters: DashboardOrdersFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim().length > 0) {
    params.set('q', filters.q.trim());
  }
  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.type !== 'all') {
    params.set('type', filters.type);
  }
  if (filters.paymentMethod !== 'all') {
    params.set('pay', filters.paymentMethod);
  }
  params.set('period', filters.period);
  if (filters.period === 'custom') {
    params.set('from', filters.dateFrom);
    params.set('to', filters.dateTo);
  }
  return params;
}

export function periodIncludesReferenceDay(
  filters: DashboardOrdersFilters,
  referenceBusinessDate: string,
): boolean {
  return (
    filters.dateFrom <= referenceBusinessDate && referenceBusinessDate <= filters.dateTo
  );
}
