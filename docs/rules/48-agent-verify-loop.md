---
description: How the agent must verify its own work (lint, typecheck, test, build). Always applied.
alwaysApply: true
---
# Verify loop: lint, typecheck, test, build

The task is not done until these four commands pass **from the repo root**, and their real output is pasted:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## 1. Work in small batches

- Edit at most ~5 files, then run `pnpm --filter <package> lint` and `pnpm --filter <package> typecheck`
  for the package you touched. Fix every error before writing more code.
- Never write a whole feature and lint at the end. 50 lint errors at the end means the loop was skipped.
- Run the tests for the files you touched (`pnpm --filter <package> test -- <file>`) before moving on.

## 2. After changing dependencies

- Any change to a `package.json` → run `pnpm install` **from the repo root**, then re-run lint and typecheck.
- Commit `pnpm-lock.yaml` together with the `package.json` change.
- Errors that say **"error typed value"**, **"type that could not be resolved"** or
  **"Unsafe call of a type that could not be resolved"** mean TypeScript cannot find a module or type.
  This is never fixed with a cast. Check, in order:
  1. Is the package in this package's `package.json` (not only the root)? Run `pnpm install`.
  2. Does the import path exist and match the package's exports?
  3. Is the file inside `tsconfig.eslint.json` `include`?
  4. Restart the ESLint/TS server in the editor (stale cache) and run `pnpm lint` in the terminal.
     The terminal result is the truth, not the editor squiggles.

## 3. Fixing errors: allowed vs forbidden

Allowed: fix the types, add a type guard or a Zod parse for unknown data, remove dead conditions,
split code, install the missing dependency.

Forbidden (stop and ask instead):
- `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as X`, `!` to silence errors
- Editing ESLint config, tsconfig, `uiOnlyFiles` or these rules to make an error disappear
- Moving code to a folder or file type that a rule does not cover (e.g. logic in a new `screens/*.tsx`)
- `.skip`, `.only`, deleting or weakening a test, raising timeouts to hide slowness
- Writing tests that run ESLint, tsc or the build from inside Vitest/Jest. `pnpm lint` already does that.

## 4. `no-unnecessary-condition` and unknown errors

- If TypeScript says a value is always truthy/falsy, the branch is dead: delete it, don't add `?.` or `!`.
- RTK Query: a mutation result is `{ data } | { error }`. Check with `'error' in result`, then read the
  error code through one helper that narrows `unknown` with type guards (see `features/menu/menu-api-errors.ts`).
  Never destructure `result.error` as if it were typed.

## 5. Tests

- New `.ts` logic (hooks' pure helpers, utils, mappers) gets a Vitest/Jest test in the same change.
- API changes get e2e tests: happy path, 400, 403 (role without the permission), 404 (other org's id).
- A test must fail if the feature is broken. Check the input actually has the thing you assert is removed
  (e.g. an image test input must contain EXIF before asserting the output has none).

## 6. Before saying "done"

1. `git status`: no stray files, lockfile committed if deps changed.
2. Run the four commands from the root, paste the full output of each.
3. List every file changed and every deviation from the plan, with the reason.
4. If anything fails, say so. Never write "all green" without the output.
