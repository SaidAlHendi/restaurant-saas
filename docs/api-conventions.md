# API conventions

- REST over JSON, prefix `/v1`. NestJS controllers with DTOs built from the Zod schemas in `packages/shared` (nestjs-zod) for body,
  params, query and response (also generates OpenAPI).
- Auth: short-lived JWT access token (15 min) + httpOnly refresh cookie for dashboard users.
  Devices use a device token; cashiers then add a staff session via PIN (`X-Staff-Session`).
- Request context resolved by middleware: `{ userId?, membershipId?, orgId, branchIds, deviceId?, permissions }`.
  Handlers never read org from body/params. Branch ids in the path are checked against `branchIds`.
- Each request runs DB work in a transaction that first sets `SET LOCAL app.org_id`.
- Errors: `{ "error": { "code": "ORDER_INVALID_TRANSITION", "message": "...", "details": {} } }`.
  400 validation, 401 unauthenticated, 403 no permission or plan feature, 404 not found (also for
  other tenants' resources), 409 conflict (version/state), 422 business rule, 429 rate limit.
- Idempotent creates: header `Idempotency-Key`; for orders it equals `client_order_id`.
- Pagination: cursor-based `?cursor=&limit=` (max 100), response `{ items, nextCursor }`.
- Money in API = integer minor units + `currency`. Dates ISO 8601 UTC; `businessDate` as `YYYY-MM-DD`.
- Realtime: Socket.io namespace `/rt`, room `branch:{branchId}`; events `order.placed`,
  `order.updated`, `order.item_updated`, `menu.availability_changed`, each `{ orderId, version, ... }`.
- Naming: routes kebab-case plural nouns (`/v1/branches/:branchId/orders`), JSON camelCase,
  DB snake_case.
