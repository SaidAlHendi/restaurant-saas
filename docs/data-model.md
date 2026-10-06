# Data model (PostgreSQL)

Conventions: `id uuid` (UUIDv7, generated in app), `created_at`/`updated_at timestamptz default now()`.
Every tenant table has `org_id uuid not null references organizations` and RLS policy
`org_id = current_setting('app.org_id')::uuid`. Money = `bigint` minor units, suffix `_minor`.
Translatable text = `jsonb` like `{"ar":"…","en":"…"}`. Tax in basis points (`1500` = 15%).

## Platform & identity
- **users**: id, email (unique, nullable for PIN-only staff), password_hash, name, locale, is_platform_admin, platform_role (`super`|`support`|`billing`|null), last_login_at, **last_org_id** (nullable FK → organizations — login/switch-org preference)
- **auth_sessions**: id, user_id, token_hash (SHA-256 of refresh cookie), family_id, expires_at, revoked_at, replaced_by, user_agent, ip, created_at — refresh rotation + reuse detection
- **organizations**: id, name, slug (unique), country, default_currency, default_locale, locales text[], logo_key, status (`trial`|`active`|`past_due`|`suspended`|`cancelled`), created_at
- **branches**: id, org_id, name, slug, timezone, currency, tax_rate_bp int, tax_inclusive bool, day_start_hour smallint default 4, address jsonb, receipt_header, receipt_footer, is_active
- **roles**: id, org_id (null = system role), key (`owner`|`manager`|`cashier`|`kitchen`|custom), name, is_system
- **role_permissions**: role_id, permission_key, **org_id** (nullable; mirrors `roles.org_id`, set by `BEFORE INSERT/UPDATE` trigger `sync_role_permissions_org_id`) — PK(role_id, permission_key)
- **memberships**: id, org_id, user_id, role_id, pin_hash, all_branches bool, status (`active`|`invited`|`disabled`) — UNIQUE(org_id, user_id)
- **membership_branches**: membership_id, branch_id, org_id — PK(membership_id, branch_id)
- **devices**: id, org_id, branch_id, type (`pos`|`kds`), name, token_hash, paired_at, last_seen_at, revoked_at
- **device_pairing_codes**: code (6 digits), org_id, branch_id, type, expires_at, used_at
- **tables**: id, org_id, branch_id, label, qr_token (unique), is_active

## Catalog
- **categories**: id, org_id, name jsonb, sort_order int, is_active, deleted_at
- **products**: id, org_id, category_id, name jsonb, description jsonb, price_minor bigint, image_key, is_active, sort_order, deleted_at
- **modifier_groups**: id, org_id, name jsonb, min_select smallint, max_select smallint, deleted_at
- **modifiers**: id, org_id, group_id, name jsonb, price_delta_minor bigint default 0, is_active, sort_order, deleted_at
- **product_modifier_groups**: product_id, group_id, org_id, sort_order — PK(product_id, group_id)
- **branch_product_overrides**: org_id, branch_id, product_id, price_minor (nullable), is_available bool — PK(branch_id, product_id)
- **menu_publications**: id, org_id, published_at, published_by — used to purge CDN cache

## Orders
- **branch_counters**: branch_id, business_date date, last_order_number int, org_id — PK(branch_id, business_date)
- **shifts**: id, org_id, branch_id, opened_by, opened_at, opening_cash_minor, closed_by, closed_at, counted_cash_minor, expected_cash_minor
- **orders**: id, org_id, branch_id, client_order_id uuid, order_number int, business_date date, type (`dine_in`|`takeaway`), status (`draft`|`placed`|`preparing`|`ready`|`completed`|`cancelled`|`refunded`), payment_status (`unpaid`|`partial`|`paid`|`refunded`), table_id, customer_name, notes, subtotal_minor, discount_minor, tax_minor, total_minor, currency, shift_id, created_by (membership), device_id, cancel_reason, version int default 1, placed_at, completed_at, cancelled_at, created_at, updated_at
  - UNIQUE(branch_id, client_order_id); UNIQUE(branch_id, business_date, order_number)
  - INDEX(org_id, branch_id, created_at desc); INDEX(branch_id, status) WHERE status in active states; INDEX(org_id, business_date)
- **order_items**: id, org_id, order_id, product_id, product_name_snapshot jsonb, unit_price_minor, quantity int, line_total_minor, notes, status (`pending`|`preparing`|`ready`|`voided`), is_addition bool, voided_at, void_reason, voided_by, created_at — INDEX(order_id)
- **order_item_modifiers**: id, org_id, order_item_id, modifier_id, name_snapshot jsonb, price_delta_minor
- **payments**: id, org_id, order_id, method (`cash`|`card`|`other`), amount_minor, tendered_minor, change_minor, status (`captured`|`refunded`), created_by, created_at
- **order_events** (append-only): id, org_id, order_id, type, from_status, to_status, payload jsonb, actor_membership_id, approved_by_membership_id, device_id, created_at — INDEX(order_id, created_at)

## Billing
- **plans**: id, key (`free`|`menu`|`restaurant`|`business`), name, price_minor, currency, interval, is_public
- **plan_features**: plan_id, feature_key, limit_value int null — PK(plan_id, feature_key)
- **subscriptions**: id, org_id (unique), plan_id, status (`trialing`|`active`|`past_due`|`cancelled`), branch_quantity int, provider (`paddle`), provider_customer_id, provider_subscription_id, trial_ends_at, current_period_end, updated_at
- **billing_events**: id, provider_event_id (unique), type, payload jsonb, processed_at — webhook idempotency

## Reporting (written by worker, read by dashboards)
- **daily_sales**: org_id, branch_id, business_date, orders_count, cancelled_count, gross_minor, discount_minor, tax_minor, net_minor, dine_in_count, takeaway_count, cash_minor, card_minor — PK(branch_id, business_date)
- **daily_product_sales**: org_id, branch_id, business_date, product_id, quantity, revenue_minor — PK(branch_id, business_date, product_id)
- **hourly_sales**: org_id, branch_id, business_date, hour smallint, orders_count, revenue_minor — PK(branch_id, business_date, hour)

## Infrastructure tables
- **outbox_events**: id, org_id, type, aggregate_id, payload jsonb, created_at, published_at — INDEX(published_at) WHERE published_at is null
- **audit_logs**: id, org_id, actor_user_id, action, entity, entity_id, before jsonb, after jsonb, ip, created_at
- **idempotency_keys** (generic, for non-order POSTs): key, org_id, endpoint, response jsonb, created_at

## Business date
`business_date = date((now() at time zone branch.timezone) - make_interval(hours => branch.day_start_hour))`
computed once when the order is created and never changed.

## Later (not MVP): partition `orders`, `order_items`, `order_events` monthly by `created_at`;
read replica for reports; archive orders older than plan retention.
