# Restaurant SaaS — REST API Reference

**Service:** `apps/api` (NestJS, TypeScript, PostgreSQL, Redis)  
**Version prefix:** `/v1` (no global path prefix beyond controller routes)  
**Source of truth for request/response shapes:** Zod schemas in `packages/shared` (validated via `nestjs-zod` DTOs)

---

## 1. Overview and global rules

### 1.1 Purpose

Multi-tenant restaurant SaaS API: identity and sessions, org/branch tenancy, catalog (menu), branch-scoped ordering and tables, staff memberships, public SEO menu payloads, and local media serving in development.

Processing is **synchronous** for all HTTP handlers documented here. Side effects that must survive process restarts (realtime notifications, downstream workers) are written to **`outbox_events`** in the same database transaction as the command; a background **outbox publisher** (when `APP_ROLE` is `worker` or `all`) delivers them asynchronously.

There is **no** `/api` prefix: routes are exactly as declared on controllers (e.g. `GET /v1/health`).

### 1.2 Architectural patterns

| Pattern | Rule |
|--------|------|
| **Tenant isolation** | `orgId` comes from the JWT/session context, never from the request body. PostgreSQL RLS uses `SET LOCAL app.org_id` per transaction. |
| **Branch scope** | Routes under `/v1/branches/:branchId/...` require `:branchId` to be in the caller’s allowed branch set; otherwise **404** (not 403). |
| **Route naming** | Kebab-case, **plural** resource nouns (`/v1/products`, `/v1/modifier-groups`). |
| **JSON** | camelCase in API; money as integer **minor units** + ISO 4217 **currency** (3 letters). |
| **Timestamps** | ISO 8601 UTC (`timestamptz`). Business dates as `YYYY-MM-DD`. |
| **Pagination** | Cursor-based: `?cursor=&limit=` (max **100**, default **20**). Response `{ items, nextCursor }`. |
| **Idempotent creates** | Order creation: header **`Idempotency-Key`** must equal body **`clientOrderId`** (UUID). Duplicate returns **200** with existing order. |
| **Soft delete** | Catalog entities use `deleted_at`; DELETE endpoints soft-delete. |
| **Orders** | Never hard-deleted; cancel/void are state changes via `state-machine.ts`. |
| **Errors** | Uniform envelope `{ "error": { "code", "message", "details" } }` (see §1.5). |
| **Realtime** | Socket.io namespace `/rt`, room `branch:{branchId}` — not part of REST; events are emitted only from the outbox publisher. |

### 1.3 Authentication and request headers

| Header | When | Description |
|--------|------|-------------|
| `Authorization: Bearer <accessToken>` | Protected routes | JWT access token (~15m, configurable via `JWT_ACCESS_TTL`). Payload: `sub` (userId), `org` (orgId), `sid` (sessionId). |
| `Cookie: refresh_token=...` | `POST /v1/auth/refresh`, `POST /v1/auth/logout` | HttpOnly refresh cookie; path `/v1/auth`; rotation on refresh. |
| `X-Branch-Id: <uuid>` | Optional on authenticated calls | Sets “current branch” in context (`currentBranchId` on `/v1/me`). |
| `Idempotency-Key: <uuid>` | `POST .../orders` | Must match `clientOrderId`. |

**Public routes** (`@Public()`): health, ready, auth signup/login/refresh/logout, public menu, local media (non-production).

**Permission model:** Most routes declare `@RequirePermission('…')`. Some order mutations use `@Authenticated()` only; **fine-grained permission** is enforced in the service (status transitions, void item).

Device tokens and `X-Staff-Session` are described in `docs/api-conventions.md` for future POS/KDS milestones; the current `AuthGuard` accepts **Bearer JWT only**.

### 1.4 Rate limiting

Global default (Redis-backed): **100 requests / 60s** per throttler key. Stricter limits on selected auth/public routes (see endpoint sections). Exceeded → **429** with `error.code` `RATE_LIMITED` or Nest throttler response.

Health routes skip throttling.

### 1.5 Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { "issues": [] }
  }
}
```

| HTTP | Typical `error.code` | When |
|------|----------------------|------|
| 400 | `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `UNSUPPORTED_IMAGE_TYPE` | Zod/body validation, upload limits |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `REFRESH_*` | Missing/invalid JWT or refresh |
| 403 | `FORBIDDEN` | Missing permission or entitlement |
| 404 | `NOT_FOUND` | Missing resource or cross-tenant/branch (masked) |
| 409 | `CONFLICT`, `ORDER_VERSION_CONFLICT`, `TABLE_LABEL_TAKEN` | Optimistic lock, unique constraint |
| 410 | `GONE` | Cancelled org public menu |
| 422 | `ORDER_INVALID_TRANSITION`, `ORDER_NOT_EDITABLE`, `BRANCH_CURRENCY_MISMATCH`, … | Business rules |
| 429 | `RATE_LIMITED` | Throttling |
| 500 | `INTERNAL_ERROR` | Unhandled exception |
| 503 | `HTTP_ERROR` | Readiness failure (`GET /v1/ready`) |

Nest `UnauthorizedException` / `ServiceUnavailableException` map to `HTTP_ERROR` unless handled as `AppError`.

### 1.6 Environment variables (API process)

Variables validated in `apps/api/src/config/env.ts`. Copy from `.env.example` at repo root.

| Name | Key | Description | Example |
|------|-----|-------------|---------|
| Node environment | `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| HTTP port | `PORT` | Nest listen port | `3000` |
| Process role | `APP_ROLE` | `api` (HTTP only), `worker` (jobs), or `all` | `all` |
| Runtime DB | `DATABASE_URL` | PostgreSQL URL for `app_user` (RLS) | `postgresql://app_user:…@localhost:5432/restaurant_saas` |
| Migration DB | `DATABASE_MIGRATION_URL` | PostgreSQL URL for `app_owner` | `postgresql://app_owner:…@localhost:5432/restaurant_saas` |
| Worker DB | `DATABASE_WORKER_URL` | Required when `APP_ROLE` is `worker` or `all` | `postgresql://app_worker:…@localhost:5432/restaurant_saas` |
| Outbox poll interval | `OUTBOX_PUBLISHER_INTERVAL_MS` | Worker publisher sleep (ms) | `500` |
| Redis | `REDIS_URL` | Redis for throttling, sessions, etc. | `redis://localhost:6379` |
| Log level | `LOG_LEVEL` | Pino level | `info` |
| JWT secret | `JWT_ACCESS_SECRET` | Min 32 chars | *(secret)* |
| JWT TTL | `JWT_ACCESS_TTL` | Access token lifetime | `15m` |
| Secure cookies | `COOKIE_SECURE` | `true`/`false` for refresh cookie | `false` (local) |
| Seed password | `SEED_PASSWORD` | Required for `pnpm db:seed` only | *(secret)* |
| CORS | `CORS_ORIGINS` | Comma-separated origins; omit = reflect request origin with credentials | `http://localhost:5173,http://localhost:5174` |
| Storage driver | `STORAGE_DRIVER` | `local` or `s3` | `local` |
| Local storage root | `STORAGE_LOCAL_ROOT` | Filesystem root for objects | `apps/api/.storage` |
| Public object base URL | `STORAGE_PUBLIC_BASE_URL` | Base for product image URLs | `http://localhost:3000/v1/media` |
| S3 endpoint | `S3_ENDPOINT` | Required if `STORAGE_DRIVER=s3` | *(R2 endpoint)* |
| S3 region | `S3_REGION` | Required if s3 | `auto` |
| S3 bucket | `S3_BUCKET` | Required if s3 | `restaurant-assets` |
| S3 access key | `S3_ACCESS_KEY_ID` | Required if s3 | *(secret)* |
| S3 secret | `S3_SECRET_ACCESS_KEY` | Required if s3 | *(secret)* |
| S3 public base | `S3_PUBLIC_BASE_URL` | CDN base for public URLs | `https://cdn.example.com` |

Frontend-only variables (`VITE_*`, `PUBLIC_*`) are not read by the API binary.

---

## 2. Endpoints overview

| Module | Method | Route | Auth | Permission / notes |
|--------|--------|-------|------|-------------------|
| **Health** | GET | `/v1/health` | Public | Liveness |
| **Health** | GET | `/v1/ready` | Public | Postgres + Redis readiness |
| **Auth** | POST | `/v1/auth/signup` | Public | Rate limit 5/h |
| **Auth** | POST | `/v1/auth/login` | Public | Rate limit 20/min |
| **Auth** | POST | `/v1/auth/refresh` | Public | Cookie refresh; 30/min |
| **Auth** | POST | `/v1/auth/logout` | Public | Clears refresh session |
| **Auth** | POST | `/v1/auth/switch-org` | Bearer | Switch active org |
| **Identity** | GET | `/v1/me` | Bearer | Session profile |
| **Tenancy** | GET | `/v1/branches` | Bearer | `branches.read` |
| **Tenancy** | POST | `/v1/branches` | Bearer | `branches.manage` |
| **Tenancy** | PATCH | `/v1/branches/:branchId` | Bearer | `branches.manage` |
| **Tenancy** | GET | `/v1/memberships` | Bearer | `staff.read` |
| **Catalog** | GET | `/v1/categories` | Bearer | `menu.read` |
| **Catalog** | PUT | `/v1/categories/reorder` | Bearer | `menu.manage` |
| **Catalog** | POST | `/v1/categories` | Bearer | `menu.manage` |
| **Catalog** | PATCH | `/v1/categories/:categoryId` | Bearer | `menu.manage` |
| **Catalog** | DELETE | `/v1/categories/:categoryId` | Bearer | `menu.manage` |
| **Catalog** | GET | `/v1/products` | Bearer | `menu.read` |
| **Catalog** | PUT | `/v1/products/reorder` | Bearer | `menu.manage` |
| **Catalog** | GET | `/v1/products/:productId` | Bearer | `menu.read` |
| **Catalog** | POST | `/v1/products` | Bearer | `menu.manage` |
| **Catalog** | PATCH | `/v1/products/:productId` | Bearer | `menu.manage` |
| **Catalog** | DELETE | `/v1/products/:productId` | Bearer | `menu.manage` |
| **Catalog** | POST | `/v1/products/:productId/image` | Bearer | `menu.manage`; multipart |
| **Catalog** | DELETE | `/v1/products/:productId/image` | Bearer | `menu.manage` |
| **Catalog** | PUT | `/v1/products/:productId/modifier-groups` | Bearer | `menu.manage` |
| **Catalog** | GET | `/v1/modifier-groups` | Bearer | `menu.read` |
| **Catalog** | GET | `/v1/modifier-groups/:groupId` | Bearer | `menu.read` |
| **Catalog** | POST | `/v1/modifier-groups` | Bearer | `menu.manage` |
| **Catalog** | PATCH | `/v1/modifier-groups/:groupId` | Bearer | `menu.manage` |
| **Catalog** | DELETE | `/v1/modifier-groups/:groupId` | Bearer | `menu.manage` |
| **Catalog** | POST | `/v1/modifier-groups/:groupId/modifiers` | Bearer | `menu.manage` |
| **Catalog** | PUT | `/v1/modifier-groups/:groupId/modifiers/reorder` | Bearer | `menu.manage` |
| **Catalog** | PATCH | `/v1/modifier-groups/:groupId/modifiers/:modifierId` | Bearer | `menu.manage` |
| **Catalog** | DELETE | `/v1/modifier-groups/:groupId/modifiers/:modifierId` | Bearer | `menu.manage` |
| **Ordering** | POST | `/v1/branches/:branchId/orders` | Bearer | `orders.create`; idempotency header |
| **Ordering** | GET | `/v1/branches/:branchId/orders` | Bearer | `orders.read` |
| **Ordering** | GET | `/v1/branches/:branchId/orders/:orderId` | Bearer | `orders.read` |
| **Ordering** | GET | `/v1/branches/:branchId/orders/:orderId/events` | Bearer | `orders.read` |
| **Ordering** | POST | `/v1/branches/:branchId/orders/:orderId/status` | Bearer | Auth + transition permission in service |
| **Ordering** | POST | `/v1/branches/:branchId/orders/:orderId/items` | Bearer | `orders.create` |
| **Ordering** | POST | `/v1/branches/:branchId/orders/:orderId/items/:itemId/void` | Bearer | Auth + void permission in service |
| **Ordering** | GET | `/v1/branches/:branchId/tables` | Bearer | `branches.read` |
| **Ordering** | POST | `/v1/branches/:branchId/tables` | Bearer | `branches.manage` |
| **Ordering** | PATCH | `/v1/branches/:branchId/tables/:tableId` | Bearer | `branches.manage` |
| **Ordering** | POST | `/v1/branches/:branchId/tables/:tableId/rotate-qr` | Bearer | `branches.manage` + feature `menu.table_qr` |
| **Public menu** | GET | `/v1/public/menus/:orgSlug` | Public | CDN cache headers |
| **Public menu** | GET | `/v1/public/menus/:orgSlug/branches/:branchSlug` | Public | Branch-scoped menu |
| **Public menu** | GET | `/v1/public/tables/:token` | Public | QR token resolution |
| **Public menu** | GET | `/v1/public/sitemap` | Public | Org slugs for SEO |
| **Media** | GET | `/v1/media/*` | Public | Local dev only; streams WebP |

---

## 3. Reusable JSON Schemas (Draft 2020-12)

Shared components referenced by endpoint sections.

### 3.1 ErrorEnvelope

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://restaurant-saas.local/schemas/ErrorEnvelope.json",
  "type": "object",
  "required": ["error"],
  "properties": {
    "error": {
      "type": "object",
      "required": ["code", "message", "details"],
      "properties": {
        "code": { "type": "string" },
        "message": { "type": "string" },
        "details": { "type": "object", "additionalProperties": true }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

### 3.2 LocalizedTextMap

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://restaurant-saas.local/schemas/LocalizedTextMap.json",
  "type": "object",
  "additionalProperties": { "type": "string" },
  "description": "Keys must be org-enabled locales; default locale required on create unless optional."
}
```

### 3.3 MoneyMinor

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://restaurant-saas.local/schemas/MoneyMinor.json",
  "type": "integer",
  "minimum": 0,
  "maximum": 9007199254740991
}
```

### 3.4 ProductImageUrls

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://restaurant-saas.local/schemas/ProductImageUrls.json",
  "type": "object",
  "required": ["url400", "url800", "url1200"],
  "properties": {
    "url400": { "type": "string", "format": "uri" },
    "url800": { "type": "string", "format": "uri" },
    "url1200": { "type": "string", "format": "uri" }
  },
  "additionalProperties": false
}
```

### 3.5 CursorListResponse (generic)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://restaurant-saas.local/schemas/CursorListResponse.json",
  "type": "object",
  "required": ["items", "nextCursor"],
  "properties": {
    "items": { "type": "array" },
    "nextCursor": { "type": ["string", "null"] }
  },
  "additionalProperties": false
}
```

### 3.6 OrderStatus / OrderType enums

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://restaurant-saas.local/schemas/OrderEnums.json",
  "$defs": {
    "OrderType": { "enum": ["dine_in", "takeaway"] },
    "OrderStatus": {
      "enum": ["draft", "placed", "preparing", "ready", "completed", "cancelled", "refunded"]
    },
    "PaymentStatus": { "enum": ["unpaid", "partial", "paid", "refunded"] },
    "OrderItemStatus": { "enum": ["pending", "preparing", "ready", "voided"] }
  }
}
```

Full entity schemas match `packages/shared` exports (`productSchema`, `orderDetailSchema`, `publicMenuPayloadSchema`, etc.) and are inlined where endpoints return them.

---

## 4. Detailed endpoints

### 4.1 Health

#### GET /v1/health

**Description:** Process liveness check. Does not touch PostgreSQL or Redis. **Sync.**

**Auth:** None.

**Response 200 — JSON Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["status"],
  "properties": { "status": { "const": "ok" } },
  "additionalProperties": false
}
```

**Example:**

```http
GET /v1/health HTTP/1.1
Host: localhost:3000
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok"}
```

---

#### GET /v1/ready

**Description:** Readiness: PostgreSQL and Redis must be up. **Sync.**

**Auth:** None.

**Response 200:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["status", "info"],
  "properties": {
    "status": { "const": "ok" },
    "info": { "type": "object", "additionalProperties": true }
  }
}
```

**Response 503:** Body uses Nest `ServiceUnavailableException` shape wrapped as `HTTP_ERROR`; includes `details.status` / `details.info` when present.

**Example (failure):**

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": {
    "code": "HTTP_ERROR",
    "message": "Service Unavailable Exception",
    "details": { "status": "error", "info": { "database": { "status": "down" } } }
  }
}
```

---

### 4.2 Auth (`AuthController`)

Refresh cookie: name `refresh_token`, path `/v1/auth`, httpOnly, sameSite=lax, maxAge 30 days.

#### POST /v1/auth/signup

**Description:** Creates user, organization, default branch, owner membership, session; sets refresh cookie; returns access token. **Sync** (single DB transaction + follow-up read).

**Auth:** Public. **Rate limit:** 5 requests / hour.

**Request body — JSON Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name", "email", "password", "restaurantName", "country", "timezone", "currency", "defaultLocale"],
  "properties": {
    "name": { "type": "string", "minLength": 1, "maxLength": 200 },
    "email": { "type": "string", "format": "email" },
    "password": { "type": "string", "minLength": 10, "maxLength": 128 },
    "restaurantName": { "type": "string", "minLength": 1, "maxLength": 200 },
    "country": { "type": "string", "minLength": 2, "maxLength": 2 },
    "timezone": { "type": "string", "minLength": 1, "maxLength": 64 },
    "currency": { "type": "string", "minLength": 3, "maxLength": 3 },
    "defaultLocale": { "enum": ["ar", "en"] }
  },
  "additionalProperties": false
}
```

**Response 201** (Nest default for POST): `signupResponseSchema`

**Errors:** 400 `VALIDATION_ERROR` (email taken); 429 rate limit.

**Example:**

```http
POST /v1/auth/signup HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Said Owner",
  "email": "owner@example.com",
  "password": "secure-pass-10",
  "restaurantName": "Demo Bistro",
  "country": "SA",
  "timezone": "Asia/Riyadh",
  "currency": "SAR",
  "defaultLocale": "ar"
}
```

```http
HTTP/1.1 201 Created
Set-Cookie: refresh_token=...; Path=/v1/auth; HttpOnly; SameSite=Lax
Content-Type: application/json

{
  "accessToken": "eyJhbG...",
  "user": { "id": "01933...", "email": "owner@example.com", "name": "Said Owner", "locale": "ar" },
  "org": { "id": "01933...", "name": "Demo Bistro", "slug": "demo-bistro" },
  "branch": { "id": "01933...", "name": "Demo Bistro", "slug": "demo-bistro" }
}
```

---

#### POST /v1/auth/login

**Description:** Validates credentials, creates session, sets refresh cookie. **Sync.**

**Auth:** Public. **Rate limit:** 20 / minute.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | yes | Case-normalized to lower |
| password | string | yes | Max 128 |

**Response 200:** `loginResponseSchema` — `{ accessToken, user, org }` (no branch).

**Errors:** 401 `INVALID_CREDENTIALS` with generic message; 429.

**Example:**

```http
POST /v1/auth/login HTTP/1.1
Content-Type: application/json

{"email":"owner@example.com","password":"secure-pass-10"}
```

---

#### POST /v1/auth/refresh

**Description:** Rotates refresh token (reuse detection revokes family). **Sync.**

**Auth:** Public; requires `refresh_token` cookie.

**Request body:** none.

**Response 200:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["accessToken"],
  "properties": { "accessToken": { "type": "string" } }
}
```

**Errors:** 401 `REFRESH_MISSING`, `REFRESH_INVALID`, `REFRESH_REUSE`; 429.

---

#### POST /v1/auth/logout

**Description:** Revokes session if cookie present; clears cookie. **Sync.**

**Auth:** Public (cookie optional).

**Response 200:** Empty body.

---

#### POST /v1/auth/switch-org

**Description:** Switches active organization for the current user session; new access token. **Sync.**

**Auth:** Bearer JWT (`@Authenticated()`).

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| orgId | uuid | yes |

**Response 200:** `{ accessToken, org: { id, name, slug } }`

**Errors:** 403 if not a member; 404 org not found.

---

### 4.3 Identity

#### GET /v1/me

**Description:** Returns user, org, role, permissions, branches, org list, optional current branch. **Sync.**

**Auth:** Bearer.

**Response 200:** `meResponseSchema`

**Example (truncated):**

```json
{
  "user": { "id": "…", "email": "…", "name": "…", "locale": "en" },
  "org": {
    "id": "…",
    "name": "Demo Bistro",
    "slug": "demo-bistro",
    "defaultLocale": "ar",
    "locales": ["ar"],
    "defaultCurrency": "SAR"
  },
  "role": { "id": "…", "key": "owner", "name": "Owner" },
  "permissions": ["menu.read", "menu.manage", "orders.create", "…"],
  "branches": [{ "id": "…", "name": "Main", "slug": "main", "isActive": true }],
  "orgs": [{ "id": "…", "name": "Demo Bistro", "slug": "demo-bistro" }],
  "currentBranchId": null
}
```

---

### 4.4 Tenancy — Branches

#### GET /v1/branches

**Permission:** `branches.read`

**Response 200:** `{ items: Branch[] }` — see `branchSchema`.

| Field | Type | Description |
|-------|------|-------------|
| id, orgId | uuid | |
| name, slug, timezone, currency | string | |
| taxRateBp | integer | Basis points |
| taxInclusive | boolean | |
| dayStartHour | integer | 0–23 |
| isActive | boolean | |

---

#### POST /v1/branches

**Permission:** `branches.manage`

**Request body (`createBranchBodySchema`):**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| name | string | — | Required, 1–200 |
| slug | string | auto | Optional, 1–64 |
| timezone | string | — | IANA id |
| currency | string | — | 3-letter ISO |
| taxRateBp | integer | 0 | ≥ 0 |
| taxInclusive | boolean | false | |
| dayStartHour | integer | 4 | 0–23 |

**Response 201:** `Branch`

---

#### PATCH /v1/branches/:branchId

**Permission:** `branches.manage`

**Path:** `branchId` — uuid.

**Request body:** All fields optional from `patchBranchBodySchema` (name, timezone, currency, taxRateBp, taxInclusive, dayStartHour, isActive).

**Response 200:** Updated `Branch`. **404** if unknown branch in org.

---

### 4.5 Tenancy — Memberships

#### GET /v1/memberships

**Permission:** `staff.read`

**Response 200:**

```json
{
  "items": [{
    "id": "uuid",
    "userId": "uuid",
    "userEmail": "email",
    "userName": "string",
    "roleKey": "owner",
    "roleName": "Owner",
    "status": "active",
    "allBranches": true,
    "branchIds": []
  }]
}
```

`status`: `active` | `invited` | `disabled`.

---

### 4.6 Catalog — Categories

#### GET /v1/categories

**Description:** Lists active and inactive categories for the org (excludes soft-deleted). **Sync.**

**Permission:** `menu.read`

**Response 200 — JSON Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["items"],
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "orgId", "name", "sortOrder", "isActive"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "orgId": { "type": "string", "format": "uuid" },
          "name": { "$ref": "#/$defs/LocalizedTextMap" },
          "sortOrder": { "type": "integer" },
          "isActive": { "type": "boolean" }
        }
      }
    }
  },
  "$defs": {
    "LocalizedTextMap": { "type": "object", "additionalProperties": { "type": "string" } }
  }
}
```

**Errors:** 401, 403.

---

#### PUT /v1/categories/reorder

**Description:** Sets `sortOrder` from array order. **Sync.**

**Permission:** `menu.manage`

**Body:**

| Field | Type | Description |
|-------|------|-------------|
| orderedIds | uuid[] | min 1; all must exist; no duplicates |

**Response 200:** Same shape as GET list.

**Errors:** 400 duplicate/unknown id; 404 category.

---

#### POST /v1/categories

**Permission:** `menu.manage`

**Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| name | LocalizedTextMap | — | Default locale required |
| isActive | boolean | true | |

**Response 201:** Category object.

**Example 400:** Unknown locale key in `name` → `VALIDATION_ERROR` / localized text rules.

---

#### PATCH /v1/categories/:categoryId

**Path:** `categoryId` (uuid)

**Body:** Any of `name`, `isActive`.

**Response 200:** Category. **404** if deleted or other org.

---

#### DELETE /v1/categories/:categoryId

**Description:** Sets `deleted_at`; row retained. **Sync.**

**Response 200:** Last Category snapshot. **404** if already deleted.

---

### 4.7 Catalog — Products

#### GET /v1/products

**Permission:** `menu.read`

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| cursor | string | — | Base64url JSON `{ sortOrder, id }` |
| limit | integer | 20 | 1–100 |
| categoryId | uuid | — | Filter |
| isActive | `true` \| `false` | — | Filter |
| search | string | — | 1–200 chars |

**Response 200:** `ProductListResponse` — `{ items: Product[], nextCursor }`

**Product fields:** id, orgId, categoryId, name (map), description (nullable map), priceMinor, currency, isActive, sortOrder, imageUrls (nullable).

---

#### PUT /v1/products/reorder

**Body:** `{ "categoryId": "uuid", "orderedIds": ["uuid", …] }`

**Response 200:** `{ items: Product[] }` in category.

---

#### GET /v1/products/:productId

**Response 200:** `ProductDetail` — Product + `modifierGroups[]` (summary, with sortOrder).

---

#### POST /v1/products

**Body (`createProductBodySchema`):**

| Field | Type | Required |
|-------|------|----------|
| categoryId | uuid | yes |
| name | LocalizedTextMap | yes |
| description | LocalizedTextMap | no |
| priceMinor | MoneyMinor | yes |
| isActive | boolean | no |

**Response 201:** `Product`

---

#### PATCH /v1/products/:productId

**Body:** Any subset of create fields.

**Response 200:** `Product`

---

#### DELETE /v1/products/:productId

Soft delete. **Response 200:** `Product`

---

#### POST /v1/products/:productId/image

**Description:** Accepts one image; converts to WebP at widths 400/800/1200; stores under org/product prefix. **Sync.**

**Content-Type:** `multipart/form-data`

| Part | Type | Required |
|------|------|----------|
| file | binary (jpeg/png/webp) | yes |

Max size **5 MiB**. Animated images rejected.

**Response 200:** Updated `Product` with `imageUrls`.

**Errors:** 400 `FILE_TOO_LARGE`, `UNSUPPORTED_IMAGE_TYPE`, missing file; 404 product.

**Example:**

```http
POST /v1/products/01933.../image HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: multipart/form-data; boundary=----boundary

------boundary
Content-Disposition: form-data; name="file"; filename="dish.png"
Content-Type: image/png

<binary>
------boundary--
```

---

#### DELETE /v1/products/:productId/image

Removes image keys and clears `imageKey`. **Response 200:** `Product`

---

#### PUT /v1/products/:productId/modifier-groups

**Body:** `{ "groupIds": ["uuid", …] }` — replaces associations; all ids must exist.

**Response 200:** `ProductDetail`

---

### 4.8 Catalog — Modifier groups

#### GET /v1/modifier-groups

**Permission:** `menu.read`. **Response 200:** `{ items: ModifierGroup[] }` — id, orgId, name, minSelect, maxSelect.

#### GET /v1/modifier-groups/:groupId

**Permission:** `menu.read`. **Response 200:** Group + `modifiers[]` (full Modifier rows). **404** if missing.

#### POST /v1/modifier-groups

**Permission:** `menu.manage`

**Body schema:** see §4.8 create table in prior section; **Response 201:** ModifierGroup.

**Example 400:** `minSelect` > `maxSelect`.

#### PATCH /v1/modifier-groups/:groupId

**Permission:** `menu.manage`. Partial fields. **Response 200:** ModifierGroup.

#### DELETE /v1/modifier-groups/:groupId

**Permission:** `menu.manage`. Soft delete. **Response 200:** ModifierGroup.

#### POST /v1/modifier-groups/:groupId/modifiers

**Permission:** `menu.manage`

**Body:**

| Field | Type | Default |
|-------|------|---------|
| name | LocalizedTextMap | required |
| priceDeltaMinor | MoneyMinor | 0 |
| isActive | boolean | true |

**Response 201:** Modifier (includes currency from org).

#### PUT /v1/modifier-groups/:groupId/modifiers/reorder

**Permission:** `menu.manage`. **Body:** `{ orderedIds: uuid[] }`. **Response 200:** `{ items: Modifier[] }`.

#### PATCH /v1/modifier-groups/:groupId/modifiers/:modifierId

**Permission:** `menu.manage`. **Response 200:** Modifier. **404** if modifier not in group.

#### DELETE /v1/modifier-groups/:groupId/modifiers/:modifierId

**Permission:** `menu.manage`. Soft delete. **Response 200:** Modifier.

---

### 4.9 Ordering — Orders

All routes require **branch scope** on `:branchId`.

#### POST /v1/branches/:branchId/orders

**Permission:** `orders.create`

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Idempotency-Key | yes | Must equal `clientOrderId` |

**Request body (`createOrderBodySchema`):**

| Field | Type | Description |
|-------|------|-------------|
| clientOrderId | uuid | Device-generated idempotency key |
| type | `dine_in` \| `takeaway` | |
| tableId | uuid | Required if dine_in; forbidden if takeaway |
| customerName | string | Optional |
| notes | string | Max 1000 |
| items | OrderLineInput[] | 1–100 lines |

**OrderLineInput:**

| Field | Type | Default |
|-------|------|---------|
| productId | uuid | |
| quantity | integer | 1–999 |
| notes | string | optional, max 500 |
| modifierIds | uuid[] | `[]` |

**Behavior:** Validates catalog, snapshots names/prices, computes totals server-side, assigns order number for branch business date, status **`placed`**, writes `order_events` + outbox. **Sync.**

**Response 201:** First create — full `OrderDetail`.

**Response 200:** Duplicate `clientOrderId` — same `OrderDetail`.

**Errors:** 400 idempotency mismatch; 404 branch/table; 422 `BRANCH_CURRENCY_MISMATCH`; validation on lines/modifiers.

**Example:**

```http
POST /v1/branches/01933.../orders HTTP/1.1
Authorization: Bearer eyJ...
Idempotency-Key: 01933abc-def0-7000-8000-000000000001
Content-Type: application/json

{
  "clientOrderId": "01933abc-def0-7000-8000-000000000001",
  "type": "takeaway",
  "items": [
    { "productId": "01933...", "quantity": 2, "modifierIds": [] }
  ]
}
```

---

#### GET /v1/branches/:branchId/orders

**Permission:** `orders.read`

**Query:**

| Parameter | Type | Description |
|-----------|------|-------------|
| cursor | string | Base64url `{ createdAt, id }` |
| limit | integer | 1–100, default 20 |
| status | OrderStatus | Filter |
| businessDate | `YYYY-MM-DD` | Filter |

**Response 200:** `{ items: OrderListItem[], nextCursor }` — each item includes `itemCount`.

---

#### GET /v1/branches/:branchId/orders/:orderId

**Response 200:** `OrderDetail` (order + items + modifiers).

---

#### GET /v1/branches/:branchId/orders/:orderId/events

**Response 200:** `{ items: OrderEvent[] }`

**OrderEvent:** id, orderId, type, fromStatus, toStatus, payload (object), actorMembershipId, createdAt.

---

#### POST /v1/branches/:branchId/orders/:orderId/status

**Auth:** Bearer (`@Authenticated()`). Permission checked per transition:

| From | To | Permission |
|------|-----|------------|
| placed | preparing | `orders.update_status` |
| preparing | ready | `orders.update_status` |
| ready | completed | `orders.update_status` |
| placed / preparing / ready | cancelled | `orders.cancel` |

**Body:**

| Field | Type | Required |
|-------|------|----------|
| to | OrderStatus | yes |
| expectedVersion | integer ≥ 1 | yes |
| reason | string | Required when `to` is `cancelled` |

**Response 200:** `OrderDetail`

**Errors:** 403 missing permission; 422 `ORDER_INVALID_TRANSITION`; 409 `ORDER_VERSION_CONFLICT` (details may include current order); 400 cancel reason missing.

---

#### POST /v1/branches/:branchId/orders/:orderId/items

**Permission:** `orders.create`

**Body:** `{ expectedVersion, items: OrderLineInput[] }`

**Response 200:** `OrderDetail` with added lines (`isAddition: true`).

**Errors:** 422 `ORDER_NOT_EDITABLE` if status disallows edits; 409 version conflict.

---

#### POST /v1/branches/:branchId/orders/:orderId/items/:itemId/void

**Auth:** Bearer. Void permission by order status: `placed` → `orders.create`; `preparing`/`ready` → `orders.cancel`.

**Body:** `{ expectedVersion, reason }` (reason 1–500 chars)

**Response 200:** `OrderDetail`

---

### 4.10 Ordering — Dining tables

#### GET /v1/branches/:branchId/tables

**Permission:** `branches.read`

**Description:** If caller also has `branches.manage` **and** plan feature `menu.table_qr`, each item includes `qrToken`; otherwise `DiningTable` without token.

**Response 200:** `{ items: (DiningTable | DiningTableWithToken)[] }`

---

#### POST /v1/branches/:branchId/tables

**Permission:** `branches.manage`

**Body:** `{ "label": "string" }` (1–50 chars)

**Response 201:** Table with `qrToken`

**Errors:** 409 `TABLE_LABEL_TAKEN`

---

#### PATCH /v1/branches/:branchId/tables/:tableId

**Body:** `{ label?, isActive? }`

**Response 200:** Table (with token if manage + feature)

---

#### POST /v1/branches/:branchId/tables/:tableId/rotate-qr

**Permission:** `branches.manage`. **Feature:** `menu.table_qr` (entitlement checked in service for listing; decorator present for API contract).

**Response 200:** Table with new `qrToken`

---

### 4.11 Public menu

**Rate limit:** 2000 / minute (controller-level). **Cache-Control** set on success and some errors (CDN-friendly).

#### GET /v1/public/menus/:orgSlug

**Query:**

| Parameter | Type | Description |
|-----------|------|-------------|
| locale | `ar` \| `en` | Optional; honored if org has `menu.multilang` entitlement |

**Response 200:** `PublicMenuPayload` — org, branches[], categories[] with nested products/modifiers, `effectiveLocale`, optional `poweredBy` (free tier).

**Errors:** 404 unknown slug or non-visible org status; **410 `GONE`** when org subscription status is `cancelled`.

**Cache-Control (success):** `public, s-maxage=60, stale-while-revalidate=600`

---

#### GET /v1/public/menus/:orgSlug/branches/:branchSlug

Same query and payload as org menu, plus `branch` object scoped to branch.

---

#### GET /v1/public/tables/:token

**Description:** Resolves QR token to slugs and table label (no menu body). **Sync.**

**Response 200:**

```json
{
  "orgSlug": "demo-bistro",
  "branchSlug": "main",
  "tableLabel": "T12",
  "defaultLocale": "ar"
}
```

**404:** Unknown token. **Cache-Control:** `public, s-maxage=30`

---

#### GET /v1/public/sitemap

**Response 200:** `{ items: [{ slug, defaultLocale, locales[] }] }`

**Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=600`

---

### 4.12 Media (local development)

#### GET /v1/media/{relativePath}

**Description:** Streams WebP object from local storage. **Only** when `NODE_ENV !== 'production'` **and** `STORAGE_DRIVER=local`. Production or S3 → **404**.

**Auth:** Public.

**Path:** Must not contain `..` or `\`. Maps to `{STORAGE_LOCAL_ROOT}/{relativePath}`.

**Response 200:** `Content-Type: image/webp` binary stream.

**Example URL:** `GET /v1/media/orgs/{orgId}/products/{productId}/{uuid}-800.webp`

---

## 5. Order and catalog data structures (API models)

### 5.1 OrderDetail (response)

Key fields from `orderDetailSchema`:

- Money block: subtotalMinor, discountMinor, taxMinor, totalMinor, currency
- Identity: id, orgId, branchId, clientOrderId, orderNumber, businessDate
- State: type, status, paymentStatus, version
- Optional: tableId, customerName, notes, placedAt, completedAt, cancelledAt, cancelReason, timestamps
- `items[]`: snapshots, void metadata, `modifiers[]` with price deltas

### 5.2 Allowed status transitions (server-enforced)

Only these transitions are accepted by `POST .../status` (others → 422):

```
placed → preparing | cancelled
preparing → ready | cancelled
ready → completed | cancelled
```

Draft/refunded/completed terminal states are not reachable via this endpoint’s transition table today.

### 5.3 Public menu vs dashboard catalog

Public payloads collapse localized maps to a single `name`/`description` string for `effectiveLocale`. Dashboard catalog returns full locale maps.

---

## 6. File and object storage layout

### 6.1 Product images

For each upload, storage prefix:

```
orgs/{orgId}/products/{productId}/{uploadUuid}
```

Object keys (WebP):

```
{prefix}-400.webp
{prefix}-800.webp
{prefix}-1200.webp
```

Database column: `products.image_key` stores `{prefix}` (no width suffix).

Public URLs:

- **Local:** `{STORAGE_PUBLIC_BASE_URL}/{key}` (default `http://localhost:{PORT}/v1/media/...`)
- **S3/R2:** `{S3_PUBLIC_BASE_URL}/{key}`

### 6.2 Local filesystem root

Default: `apps/api/.storage` (or `STORAGE_LOCAL_ROOT`). Served only through `GET /v1/media/*` in non-production local mode.

### 6.3 Outbox event payload (internal)

Not exposed via REST. Written in same transaction as order/catalog mutations; publisher emits Socket.io events (`order.placed`, `order.updated`, etc.) with `{ orderId, version, ... }`.

---

## 7. Permission keys reference

From `packages/shared/src/permissions.ts`:

`branches.read`, `branches.manage`, `staff.read`, `staff.manage`, `orders.create`, `orders.read`, `orders.update_status`, `orders.cancel`, `menu.read`, `menu.manage`, `reports.read`

System roles: `owner`, `manager`, `cashier`, `kitchen` (seeded; permissions assigned per role in DB).

---

## 8. Related documentation

- Conventions and realtime: `docs/api-conventions.md`
- Data model: `docs/data-model.md`
- Backend module boundaries: `docs/backend-architecture.md`

---

*Generated from repository controllers and `@app/shared` Zod schemas. When code and this document disagree, trust the schemas in `packages/shared`.*
