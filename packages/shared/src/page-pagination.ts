import { z } from 'zod';

export const PAGE_SIZE_MAX = 100;

/**
 * Opt-in `page` + `pageSize` query params. When both are omitted the endpoint returns every
 * row, so existing callers (POS menu, dropdowns) keep working; `page` alone uses a pageSize of 10.
 */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).optional(),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Always-paged list query: `page` defaults to 1 and `pageSize` to 10, so the response always
 * carries `{ items, page, pageSize, total }`. Used by lists that can grow without bound
 * (orders, products, admin users, audit log).
 */
export const pagedListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(DEFAULT_PAGE_SIZE),
});
export type PagedListQuery = z.infer<typeof pagedListQuerySchema>;

/** Response fields added to every page-capable list: `{ items, page, pageSize, total }`. */
export const pageMetaShape = {
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
};

export function pageResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({ items: z.array(itemSchema), ...pageMetaShape });
}

/** LIMIT/OFFSET for a paged request, or `null` when the caller did not ask for a page. */
export function pageWindow(query: PageQuery): { limit: number; offset: number } | null {
  if (query.page === undefined && query.pageSize === undefined) return null;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

export function pageMeta(query: PageQuery, total: number): { page: number; pageSize: number; total: number } {
  if (pageWindow(query) === null) return { page: 1, pageSize: Math.max(total, 1), total };
  return { page: query.page ?? 1, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE, total };
}

/** For lists that are filtered in memory (e.g. by the caller's branches) before paging. */
export function slicePage<T>(
  all: readonly T[],
  query: PageQuery,
): { items: T[]; page: number; pageSize: number; total: number } {
  const window = pageWindow(query);
  const items = window ? all.slice(window.offset, window.offset + window.limit) : [...all];
  return { items, ...pageMeta(query, all.length) };
}
