---
description: Component rule — .tsx files in the frontend contain UI only; all logic lives in .ts hooks, selectors and utils.
globs: apps/web/src/**/*.tsx,apps/site/app/**/*.tsx,packages/ui/src/**/*.tsx
alwaysApply: false
---
# .tsx = UI only

Every `.tsx` file renders UI from props. Logic lives in `.ts` files next to it.

## Pattern: view + view-model hook
```
features/orders/
  components/OrdersTable.tsx        # UI only: props in, JSX out
  components/OrdersFilters.tsx      # UI only
  hooks/use-orders-page.ts          # logic: RTK Query, dispatch, filters, pagination, derived data, handlers
  pages/OrdersPage.tsx              # glue: const vm = useOrdersPage(); return <OrdersView {...vm} />
  orders.utils.ts                   # pure helpers (sorting, mapping, totals)
  orders.selectors.ts               # Redux selectors
```

## Allowed in a feature `.tsx`
- JSX, props and their types, mapping arrays to elements, simple conditional rendering (`isLoading ? <Skeleton/> : ...`).
- Calling **one** view-model hook from the same feature (pages only) and `useTranslation()`.
- Passing callbacks received from props to event handlers (`onClick={onCancel}`).
- Components from `@app/ui`.

## Not allowed in a feature `.tsx` (move to a `.ts` hook/util)
- `useState`, `useEffect`, `useReducer`, `useMemo`, `useCallback`, `useRef` for anything except DOM refs passed to UI.
- RTK Query hooks, `useDispatch`/`useSelector`/`useAppSelector`, `fetch`, axios, sockets, localStorage.
- Calculations (totals, tax, filtering, sorting, grouping), date/money formatting logic, validation, permission checks.
- Inline handlers with more than one statement. Write `onSubmit={onSubmit}`, not `onSubmit={() => { ...logic... }}`.

## Shared UI primitives (`packages/ui`)
- May hold purely visual state (open/closed, hover, focus) and use Radix/shadcn internals. No business logic, no API, no Redux.
- Reusable behavior that is not visual (debounce, pagination math, table state) lives in `packages/ui/src/hooks/*.ts`.

## Enforcement
ESLint override for `apps/web/src/features/**/components/**/*.tsx` and `apps/web/src/features/**/pages/**/*.tsx`
uses `no-restricted-imports` to block `react-redux`, `@reduxjs/toolkit`, `**/*.api`, `socket.io-client`, and the
React hooks listed above. Do not disable this rule with eslint-disable comments.
