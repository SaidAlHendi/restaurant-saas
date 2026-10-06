# Architecture decisions

Source analysis: https://claude.ai/artifact/1S2WKdh3rWbt1CP6wGZJ4n

## Tenancy
- Organization = tenant (billing, users, menu). Branch = operating unit under it.
- Users are global; `memberships(org_id, user_id, role_id, pin_hash, all_branches)` links them.
- Devices (POS, KDS) are paired to a branch with a pairing code and hold a device token.
- Shared schema, `org_id` on every tenant row, PostgreSQL RLS via `SET LOCAL app.org_id`.

## Core tables
organizations, branches, users, memberships, membership_branches, roles, role_permissions,
devices, tables, categories, products, modifier_groups, modifiers, product_modifier_groups,
branch_product_overrides, orders, order_items, order_item_modifiers, payments, order_events,
branch_counters, shifts, plans, plan_features, subscriptions, daily_sales,
daily_product_sales, hourly_sales, outbox_events, audit_logs.

## Orders
- Id: UUIDv7. `client_order_id` from device, unique per branch.
- Daily order number: `UPDATE branch_counters ... RETURNING` inside the order transaction.
- States: draft -> placed -> preparing -> ready -> completed; placed/preparing -> cancelled;
  completed -> refunded. Item status separate (pending/preparing/ready/voided). Payment status separate.
- `version` column for optimistic locking; conditional updates on status.
- Edits after sending to kitchen add new items or void items; never mutate sent items.

## Realtime
- Socket.io rooms per branch (`branch:{id}`). Events carry order `version`.
- Realtime is a notification only. Clients refetch active orders on every (re)connect.

## Reporting
- Worker updates daily/hourly aggregate tables when orders close. Dashboards read aggregates.

## Offline (phase 2)
- Cashier PWA keeps menu in IndexedDB, creates orders locally, queues them, prints locally,
  syncs with idempotency on reconnect. No multi-device offline sync.

## Infra (start)
Managed Postgres (paid tier with backups/PITR), one always-on app server (api + socket + worker),
Cloudflare CDN + R2 for images, Sentry, uptime monitor, Paddle for subscriptions.
