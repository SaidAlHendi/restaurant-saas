# Product spec

## What we are building
A multi-tenant SaaS that lets a restaurant owner sign up, build a digital menu, and run daily
orders through a cashier screen and a kitchen screen, with reports in an owner dashboard.
Works in any modern browser on tablets, phones, and PCs. No proprietary hardware.

## Target customer (first market)
Independent restaurants, cafés, fast-casual and takeaway shops with 1–3 branches.
Languages at launch: Arabic (RTL) and English. Currency and timezone per branch.

## Users
| Who | Device | Goal |
|---|---|---|
| Owner | phone / laptop | set up menu, see orders and sales from anywhere |
| Manager | tablet / laptop | run a branch, approve cancels, manage staff |
| Cashier | tablet (touch) | take an order in seconds, take payment, print |
| Kitchen staff | wall tablet / screen | see what to cook, mark progress, never miss an order |
| Customer | own phone | read the menu fast (later: order from the table) |
| Platform admin (us) | laptop | manage tenants, plans, support |

## Plans (entitlements are data, see `plans` / `plan_features`)
| Plan | Price | Key features |
|---|---|---|
| free | $0 | public menu, 40 items, 1 language, "Powered by" badge, 1 user |
| menu | $12/mo | unlimited items, multi-language, own branding, QR per table, menu views stats |
| restaurant | $39/branch/mo | + cashier, kitchen display, unlimited orders (fair use), daily reports, shifts, 10 users/branch, 4 devices/branch |
| business | $79/branch/mo | + advanced analytics, exports, multi-branch dashboard, table QR ordering, custom roles, API |
Feature keys: `menu.multilang`, `menu.branding`, `menu.table_qr`, `pos.access`, `kds.access`,
`reports.basic`, `reports.advanced`, `reports.export`, `branches.multi`, `roles.custom`,
`ordering.table_qr`, `api.access`. Limit keys: `limit.products`, `limit.users_per_branch`,
`limit.devices_per_branch`, `limit.storage_mb`.

## Screens (MVP)
### Public
- Menu page `/{orgSlug}` (and `/{orgSlug}/{branchSlug}` when multi-branch): categories as sticky
  tabs, product cards with photo, price, description; product sheet with modifiers (display only);
  language switcher. Loads in < 1s on 4G. Cached at CDN, purged on publish.
### Owner dashboard
- Onboarding wizard: restaurant name, slug, country, currency, timezone, tax rate and mode
  (inclusive/exclusive), languages, logo.
- Menu: categories (drag to reorder), products (name/description per language, price, photo,
  active toggle, modifier groups), modifier groups (min/max select, options with price delta).
- QR codes: download printable PDF/PNG per menu and per table.
- Orders: live list + history, search by number/customer, filters (status, type, date range,
  payment method), order detail with full event timeline.
- Today: sales total, orders count, average ticket, by payment method, top 10 items.
- Staff: invite by email or create PIN-only staff, assign role and branches.
- Devices: pair a cashier or kitchen device with a 6-digit code; see last seen.
- Settings: restaurant, branch, tax, receipt header/footer, business day start hour.
- Billing: current plan, trial days left, upgrade, invoices (provider portal).
### Cashier (PWA, touch-first)
- PIN login on a paired device. Category grid → product tiles → modifier sheet → cart.
- Order type: dine-in (table) / takeaway (customer name). Notes per item and per order.
- Send to kitchen = `placed`. Pay now or later. Payment: cash (tendered → change) or card (external terminal).
- Print receipt (80mm) and kitchen ticket.
- Open orders panel: tap to add items, pay, cancel (manager PIN when required).
- Clear "sending…/offline" indicator; nothing lost on refresh.
### Kitchen display (PWA)
- Paired device, no personal login. Columns: New · Preparing · Ready.
- Card: order number, type, table/customer, age timer (turns amber at 10 min, red at 20 —
  configurable), items with modifiers and notes, additions highlighted, voided items struck through.
- One tap moves order to next state; tap an item to mark it ready. Sound on new order and on changes.
- Auto-resync on reconnect; banner when disconnected.

## Order rules (business)
- Order number restarts at 1 each business day per branch.
- Totals computed on the server. Tax inclusive or exclusive per branch.
- After `placed`, items are never edited in place: add items or void items (with reason).
- Cancel: reason required; after `preparing` requires manager approval.
- Orders are never deleted.

## Out of scope for MVP
Native apps, integrated card payments, inventory, delivery integrations, loyalty, reservations,
custom report builder, multi-device offline sync.
