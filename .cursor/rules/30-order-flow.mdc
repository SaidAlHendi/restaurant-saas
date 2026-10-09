---
description: Use when touching order creation, order edits, order status, payments, kitchen tickets, or realtime order events.
globs: apps/api/src/modules/ordering/**,apps/api/src/modules/kitchen/**,apps/api/src/core/outbox/**,apps/api/src/jobs/outbox-publisher.job.ts
alwaysApply: false
---
# Order flow rules

- All status changes go through `modules/ordering/state-machine.ts`. Add a transition there
  (with the permission it needs) before using it anywhere.
- One transaction per command: update order (with `WHERE status = $expected AND version = $v`),
  insert `order_events`, insert `outbox_events`. If 0 rows updated, return 409 with current state.
- Order creation: require `client_order_id`; on unique conflict return the existing order (200), not an error.
- Order number: upsert `branch_counters` and increment `last_order_number` in the same statement,
  inside the order transaction, `RETURNING last_order_number`.
- Items snapshot `product_name_snapshot` and `unit_price_minor`; modifiers snapshot name and price.
- After an order is `placed`, never update existing items: add new items (flagged as additions)
  or void items with a reason. Voiding after `preparing` requires manager approval.
- Totals are computed on the server from items; ignore totals sent by the client.
- Realtime payloads include `orderId`, `status`, `version`. Clients drop events older than what they have.
- Only the outbox publisher emits realtime events. Controllers and services never emit directly.
- Tests for any change here: duplicate submit, concurrent status change (two requests), invalid
  transition, cross-tenant access, edit after send.
