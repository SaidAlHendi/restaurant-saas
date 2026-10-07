---
description: TypeScript strict typecheck patterns (tsc). Read before editing .ts/.tsx in apps and packages.
globs: apps/**/*.ts,apps/**/*.tsx,packages/**/*.ts,packages/**/*.tsx
alwaysApply: false
---
# TypeScript typecheck

**Config:** `strict` via `@app/typescript-config` — every package runs `tsc -p tsconfig.json --noEmit` (or package equivalent). **Run `pnpm typecheck` in the package you touched** after each batch of files, not only at the end.

Forbidden: `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as X`, non-null `!` to silence errors.

## react-hook-form + `@hookform/resolvers/zod`

When the schema is built at runtime (dynamic locales), or uses `.refine()` / `.superRefine()`, **`zodResolver` does not infer the output type**. `useForm<MyValues>()` alone yields `UseFormReturn<..., any, FieldValues>` and breaks `handleSubmit` / props typed as `UseFormReturn<MyValues>`.

**Use three generics** (same pattern as `apps/web/src/areas/dev-ui/product-form-demo.ts`):

```typescript
const form = useForm<MyValues, unknown, MyValues>({
  resolver: zodResolver(schema),
  defaultValues,
});
```

- Export **`MyValues`** from the hook (`z.infer<typeof schema>` or a dedicated type).
- In screens, **`handleSubmit((values: MyValues) => { ... })`** — do not rely on inference from `handleSubmit` alone.
- Pass `form` into UI components typed as **`UseFormReturn<MyValues>`**.

When input and output differ (coerce/transform in Zod), use **`z.input<typeof schema>`** and **`z.output<typeof schema>`** for the first and third generic respectively.

**Dynamic `z.object(shape)`** with `Record<string, z.ZodType<string>>` often infers **`Record<string, unknown>`** for `name` fields and breaks `zodResolver` typing. Prefer **`z.record(z.string(), z.string())`** + `.superRefine()` for locale maps, or build the shape as **`Record<string, z.ZodString>`** so input/output stay `Record<string, string>`.

## `@app/shared` Zod types

- API and RTK Query args use **`z.infer<typeof …Schema>`** from shared (e.g. `ProductListQuery`, `CreateProductBody`).
- Schemas with **`.transform()`** on optional fields still produce **required keys** on the inferred output type (e.g. `isActive: boolean | undefined`). Include those keys explicitly when building query objects:

```typescript
const args: ProductListQuery = { limit: 20, isActive: undefined, cursor };
```

- Prefer **`schema.parse(body)`** at API boundaries (already done in `menu.api.ts`).

## RTK Query

- Endpoint generics must match: `builder.query<Result, Arg>` — `Arg` is **`undefined`** for no-arg queries, not `void`.
- Hook args must satisfy the full **`Arg`** type (see `ProductListQuery` above).

## UI props and spreads

- When a view sets `open` / `mode` explicitly and spreads `formProps`, type **`formProps`** as **`Omit<ComponentProps<typeof FormView>, 'open' | 'onOpenChange' | 'mode'>`** so `form` types stay aligned.

## Utilities

- **`array.splice`** returns `T | undefined` for a single removed element — narrow before use (`if (removed === undefined) return null`).

## Vite build (`apps/web`)

- **`@app/shared`** is compiled to **CommonJS** in `dist/` for the API. Vite must not consume that CJS entry for production builds (Rollup misses named exports). **`apps/web/vite.config.ts`** aliases `@app/shared` → `packages/shared/src/index.ts` so the SPA bundles shared from TypeScript source.

## Workflow

1. Edit files in one package.
2. `pnpm lint && pnpm typecheck` in that package (or root turbo).
3. Fix errors at the reported file/line; do not weaken `tsconfig`.
4. After shared API changes, run **`pnpm build`** (turbo builds `^build` deps first) or `pnpm --filter @app/shared build` before `apps/web` build when not using the Vite alias path.
