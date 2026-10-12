# API conventions

- REST over JSON, prefix `/v1`. NestJS controllers with DTOs built from the Zod schemas in `packages/shared` (nestjs-zod) for body,
  params, query and response (also generates OpenAPI).
- Auth: short-lived JWT access token (15 min) + httpOnly refresh cookie for dashboard users.
  Staff PIN login (step 9+) switches the refresh session to another member in the same org. Device pairing (`X-Staff-Session`) is deferred.
- Request context resolved by middleware: `{ userId?, membershipId?, orgId, branchIds, deviceId?, permissions }`.
  Handlers never read org from body/params. Branch ids in the path are checked against `branchIds`.
- Each request runs DB work in a transaction that first sets `SET LOCAL app.org_id`.
- Errors: `{ "error": { "code": "ORDER_INVALID_TRANSITION", "message": "...", "details": {} } }`.
  400 validation, 401 unauthenticated, 403 no permission or plan feature, 404 not found (also for
  other tenants' resources), 409 conflict (version/state), 410 gone (e.g. `INVITE_EXPIRED`), 422 business rule (e.g. `ORDER_INVALID_TRANSITION`,
  `PAYMENT_METHOD_NOT_ACCEPTED` when card is disabled on the branch), 423 locked (e.g. `PIN_LOCKED`), 429 rate limit.
  Staff/settings codes include `STAFF_ALREADY_MEMBER`, `LAST_OWNER`, `INVITE_EXPIRED`, `MANAGER_APPROVAL_REQUIRED` (ordering, step 9b), `PIN_INVALID`, `PIN_LOCKED`.
- Idempotent creates: header `Idempotency-Key`; for orders it equals `client_order_id`.
- Pagination: cursor-based `?cursor=&limit=` (max 100), response `{ items, nextCursor }`.
- Money in API = integer minor units + `currency`. Dates ISO 8601 UTC; `businessDate` as `YYYY-MM-DD`.
- Realtime: Socket.io namespace `/rt`, room `branch:{branchId}`; events `order.placed`,
  `order.updated`, `order.item_updated`, `menu.availability_changed`, `branch.settings_updated` (payload `{ branchId }` — POS invalidates menu cache), each `{ orderId, version, change, ... }` where applicable
  (`change` identifies what happened: `placed`, `status`, `items_added`, `item_voided`, `item_status`, `cancelled`, `payment`).
- Naming: routes kebab-case plural nouns (`/v1/branches/:branchId/orders`), JSON camelCase,
  DB snake_case.
