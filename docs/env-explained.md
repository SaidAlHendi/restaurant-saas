# Environment variables

Copy `.env.example` to `.env` at the repo root. Never commit real secrets.

## Core

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | API runtime (`app_user`) |
| `DATABASE_MIGRATION_URL` | Migrations (`app_owner`) |
| `DATABASE_WORKER_URL` | Outbox worker (`app_worker`) when `APP_ROLE` is `worker` or `all` |
| `REDIS_URL` | Shared Redis |
| `JWT_ACCESS_SECRET` | Min 32 characters |
| `WEB_APP_URL` | Invite links |

## Paddle Billing (API)

All optional. Checkout is enabled only when `PADDLE_API_KEY` **and** all three price ids are set.

| Variable | Notes |
|----------|--------|
| `PADDLE_ENV` | `sandbox` (default) or `production` — selects API base URL |
| `PADDLE_API_KEY` | Server-side key (never expose to the browser) |
| `PADDLE_WEBHOOK_SECRET` | Required to accept webhooks. If unset, every webhook returns **401** and the API logs one warning at startup |
| `PADDLE_PRICE_MENU` | Paddle price id for Menu |
| `PADDLE_PRICE_RESTAURANT` | Paddle price id for Restaurant |
| `PADDLE_PRICE_BUSINESS` | Paddle price id for Business |

Webhook route: `POST /v1/billing/webhooks/paddle` (raw body + `Paddle-Signature`).

Web (2c, not required for API tests): `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENV`.

## Manual sandbox check

1. Run the API locally with sandbox Paddle env vars set (including webhook secret and the three price ids).
2. Expose the API with a tunnel, e.g. `cloudflared tunnel --url http://localhost:3000` or ngrok.
3. In the Paddle sandbox dashboard, set the webhook URL to  
   `https://<tunnel-host>/v1/billing/webhooks/paddle` and subscribe to subscription + transaction events.
4. From the owner Billing UI (2c) or Paddle overlay, subscribe using test card `4242 4242 4242 4242`.
5. Confirm the org’s `subscriptions` row: `provider = paddle`, status `active`, provider ids and `current_period_end` set; `GET /v1/me` entitlements show `reason: paid` and the mapped plan.
