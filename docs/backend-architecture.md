# Backend architecture (`apps/api`)

NestJS + TypeScript (strict) + Drizzle ORM + PostgreSQL + Redis + Socket.io (`@nestjs/websockets`).
Default Express adapter. One codebase, two entry points:
`main.ts` (HTTP API + Socket.io gateway) and `worker.ts` (outbox publisher, jobs, aggregates).
Early production can run both in one process with `APP_ROLE=all`.

## Folder structure
```
apps/api/
  src/
    main.ts                   # NestFactory.create(AppModule) — HTTP + gateway
    worker.ts                 # NestFactory.createApplicationContext(WorkerModule)
    app.module.ts             # imports CoreModule + feature modules
    worker.module.ts
    config/
      env.ts                  # Zod-validated env; the only place that reads process.env
      config.module.ts
    core/                     # cross-cutting, global providers
      db/
        db.module.ts          # provides DRIZZLE (pg pool + drizzle instance)
        with-org.ts           # withOrg(orgId, tx => ...): transaction + SET LOCAL app.org_id
        schema/               # one file per module: identity.ts, tenancy.ts, catalog.ts, ordering.ts, billing.ts, reporting.ts, infra.ts
      auth/
        jwt.strategy.ts, device.strategy.ts, staff-session.service.ts
        auth.guard.ts         # resolves user / device / staff PIN session
      context/
        request-context.ts    # RequestContext { orgId, membershipId, branchIds, permissions, deviceId, userId }
        context.decorator.ts  # @Ctx() param decorator
      permissions/
        require-permission.decorator.ts   # @RequirePermission('orders.cancel')
        require-feature.decorator.ts      # @RequireFeature('reports.advanced') — plan entitlement
        permissions.guard.ts              # checks permission + branch scope + entitlement
      errors/
        app-errors.ts         # NotFoundError, ForbiddenError, ConflictError, BusinessRuleError(code), ValidationError
        http-exception.filter.ts  # maps errors to the JSON shape in api-conventions.md
      validation/
        zod-validation.pipe.ts    # (nestjs-zod) DTOs created from @app/shared schemas
      logging/                # nestjs-pino config, redaction
      realtime/
        realtime.gateway.ts   # Socket.io: auth on handshake, joins branch:{id} rooms
        realtime.module.ts
      outbox/
        outbox.service.ts     # write(tx, event) — used by services inside their transaction
    modules/
      <module>/
        <module>.module.ts
        <module>.controller.ts    # HTTP only: DTO validation, guards/decorators, call service, map response
        <module>.service.ts       # business logic + transactions; the module's public API (exported provider)
        <module>.repository.ts    # all Drizzle queries for this module's tables; every method takes tx
        <module>.events.ts        # event names + payload types this module publishes
        dto/                      # createZodDto(...) wrappers around @app/shared schemas
        <module>.service.spec.ts  # unit tests (pure logic)
      identity/ tenancy/ catalog/ ordering/ kitchen/ reporting/ billing/ notifications/ admin/ public-menu/
    jobs/                      # imported only by WorkerModule
      outbox-publisher.job.ts  # FOR UPDATE SKIP LOCKED -> Redis/Socket.io -> mark published
      aggregate-sales.job.ts   # recompute daily/hourly aggregates per (branch, business_date)
      queue.module.ts          # pg-boss to start (swappable for @nestjs/bullmq)
    lib/                       # pure helpers, no Nest/DB: money.ts, business-date.ts, uuid.ts (v7)
  drizzle/                     # generated migrations + hand-written RLS SQL
  test/
    jest-e2e.config.ts
    setup.ts                   # migrate postgres-test once, truncate between files
    factories.ts               # createOrg(), createBranch(), createMember(role), createProduct(), createOrder()
    http.ts                    # supertest helpers: asOwner(org), asCashier(branch), asDevice(...)
    <module>.e2e-spec.ts
```

## Layering rules
- Request flow: controller → guards (auth, permission, feature) → service → repository → DB.
- Controllers contain no business logic and no queries. Services never touch `Request`/`Response`.
- A service method takes `(ctx: RequestContext, input)` and opens `withOrg(ctx.orgId, tx => ...)`,
  or takes a `tx` when another service calls it inside one transaction.
- A module exports only its service. Other modules inject that service; they never import another
  module's repository or write to its tables. Only `reporting` may read other modules' tables.
- Throw typed errors from `core/errors`; the global filter formats them. No `HttpException` in services.
- Use Nest DI for everything with state (db, redis, config). `lib/` stays pure and framework-free.

## Tenancy in code
- `RequestContext` is built only by the auth guard from a verified token, device token, or staff session.
- Every repository call on a tenant table runs inside `withOrg`, so RLS applies. The app DB role is not the
  table owner and has no `BYPASSRLS`; migrations run with a separate owner role.
- `public-menu` module resolves `orgId` from the slug, read-only, no auth; responses are cacheable.
- Platform admin endpoints use `withAdmin(fn)` which writes `audit_logs`.

## Orders (critical path)
- `modules/ordering/state-machine.ts` exports `transitions` and `assertTransition(from, to, ctx)`.
- `OrderingService.placeOrder(ctx, dto)` in one transaction: idempotency lookup → counter increment →
  insert order + items (snapshots) → compute totals → `order_events` + `OutboxService.write`.
- Status change: `UPDATE ... WHERE id = $1 AND status = $from AND version = $v RETURNING *`;
  zero rows → `ConflictError` with the current order.

## Realtime
- Gateway verifies the token on handshake and joins only branches in the context.
- Only the outbox publisher emits order events (never controllers). Redis adapter when > 1 instance.
- Clients treat events as hints and refetch on reconnect.

## Observability
- nestjs-pino JSON logs with `reqId`, `orgId`, `userId`, `deviceId`; redact auth headers, passwords, PINs.
- Sentry (`@sentry/nestjs`) with tags orgId, branchId, route. `@nestjs/terminus`: `/v1/health`, `/v1/ready`.
- Swagger/OpenAPI generated from the Zod DTOs at `/v1/docs` (non-production).

## Testing
- E2E tests boot `AppModule` with `Test.createTestingModule` + Supertest against postgres-test; no DB mocks.
- Each endpoint: happy path, 400 validation, 403 permission, 404 other tenant.
- Unit tests for pure logic: state machine, totals/tax, business date.
