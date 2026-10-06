# Frontend architecture

Two React + Vite apps, because SEO and app-like screens need different rendering:

| App | What | Rendering | Why |
|---|---|---|---|
| `apps/site` | public restaurant menus, marketing pages, pricing, blog | SSR + prerender (React Router framework mode on Vite) | search engines and link previews get full HTML; fastest first load on phones |
| `apps/web` | owner dashboard, cashier PWA, kitchen PWA, platform admin | client-side SPA (Vite) | behind login, no SEO needed, app-like, works offline later |

Shared: `packages/shared` (Zod schemas + types), `packages/ui` (components, design tokens, Tailwind preset).

---

## `apps/web` — SPA

Stack: React + Vite + TypeScript strict, React Router (data router), Redux Toolkit, RTK Query,
Zod + react-hook-form (`@hookform/resolvers/zod`), react-i18next, Tailwind, vite-plugin-pwa, socket.io-client.

```
apps/web/src/
  main.tsx                      # Provider(store) + RouterProvider + i18n init
  app/
    store.ts                    # configureStore: api reducer + slices; typed hooks useAppDispatch/useAppSelector
    router.tsx                  # route tree, lazy-loaded per area, auth/role guards
    api/
      base-api.ts               # createApi with fetchBaseQuery: base URL, auth header, 401 -> refresh -> retry (mutex), tagTypes
      zod-response.ts           # helper: validate responses with Zod schemas from @app/shared (dev + test)
  areas/                        # top-level route areas, each lazy-loaded
    auth/  dashboard/  pos/  kds/  admin/
  features/                     # feature slices: endpoints, slices, components, hooks
    menu/        menu.api.ts (injectEndpoints)  pages/  components/  hooks/  menu.utils.ts  menu.selectors.ts
    orders/      orders.api.ts  components/
    cart/        cart.slice.ts  cart.selectors.ts  components/
    pos/         components/  pos.slice.ts (device, staff session)
    kds/         kds.api.ts  use-kds-board.ts  components/
    staff/  devices/  billing/  reports/  onboarding/  settings/
    session/     session.slice.ts (user, org, branch, locale)
  lib/
    realtime.ts                 # socket client; on event -> api.util.updateQueryData / invalidateTags
    money.ts  dates.ts  i18n.ts
    print/                      # 80mm receipt and kitchen ticket templates
    offline/                    # (phase 2) IndexedDB, send queue, sync
  locales/ar.json en.json
```

### Rules
- **`.tsx` = UI only.** Each page is `pages/XPage.tsx` → `const vm = useXPage(); return <XView {...vm} />`.
  `use-x-page.ts` holds all logic (RTK Query hooks, dispatch, local state, derived data, handlers).
  Components in `components/` receive props and render `@app/ui` components. Details: `.cursor/rules/45-components-ui-only.mdc`.
- **UI from `@app/ui` only** (shadcn/ui + Tailwind, themes cupcake/forest). See `docs/ui-kit.md`.
- **Server state = RTK Query only.** Every endpoint is defined with `injectEndpoints` in `features/*/*.api.ts`
  with `providesTags`/`invalidatesTags`. Components never call `fetch`/axios directly.
- **Client state = Redux slices** only for real client state: session, cart, POS device/staff session, UI prefs.
  Never copy server data into a slice.
- **Types and validation from Zod.** Request bodies and forms use the schemas in `@app/shared`
  (`z.infer` for types). Responses are validated in dev/test via `zod-response.ts`.
- **Optimistic updates** only for KDS status taps and cart; always roll back on error.
- **Realtime**: one socket per screen. On (re)connect: `invalidateTags(['ActiveOrders'])`. On event: update the
  cache with `updateQueryData` only if `event.version > cached.version`.
- **Routing**: areas lazy-loaded; guards check session + permission before rendering.
- **i18n/RTL**: all text through react-i18next; set `document.documentElement.dir/lang` on locale change;
  Tailwind logical utilities only (`ms-`, `pe-`, `start-`, `text-start`).
- **PWA**: separate manifests/start URLs for `/pos` and `/kds`; service worker caches the app shell.
- **POS UX**: touch targets ≥ 48px, cart always visible, ≤ 3 taps for a simple order, confirm disabled while sending, visible offline/sending indicator.
- **KDS UX**: order number ≥ 28px, columns New/Preparing/Ready, age-timer colors, sound after one tap to enable audio, red banner when disconnected.
- **Money/time**: `formatMoney(minor, currency, locale)` and `Intl.DateTimeFormat` with branch timezone only.

---

## `apps/site` — public pages with SEO

Stack: React + Vite + React Router framework mode (SSR), Tailwind, `packages/ui`. Data comes from the API's
public endpoints in route `loader`s (server side). No Redux here: pages are mostly static HTML.

```
apps/site/app/
  root.tsx                      # <html lang dir>, global meta, fonts
  routes/
    _index.tsx                  # marketing home (prerendered)
    pricing.tsx  features.tsx   # prerendered
    $locale.m.$orgSlug.tsx      # restaurant menu (SSR, cached at CDN)
    $locale.m.$orgSlug.$branchSlug.tsx
    sitemap[.]xml.tsx           # all published restaurants and locales
    robots[.]txt.tsx
  lib/api.server.ts             # fetch public API, Zod-validate
  lib/seo.ts                    # meta builders
```

### SEO requirements (every public page)
- Full HTML from the server (SSR or prerender); content readable with JavaScript disabled.
- `meta()` per route: unique `<title>` and description, canonical URL, Open Graph + Twitter card with image
  (restaurant logo or cover), `hreflang` alternates for ar/en, `<html lang dir>` correct.
- Structured data JSON-LD: `Restaurant` (name, address, geo, opening hours, servesCuisine, priceRange)
  and `Menu` → `MenuSection` → `MenuItem` with `offers.price` and `priceCurrency`.
- Clean URLs: `/ar/m/al-bait`, `/en/m/al-bait/riyadh-olaya`. One canonical per page; no duplicate content across locales.
- `sitemap.xml` generated from published restaurants; `robots.txt`; 404 and 410 for removed restaurants.
- Performance (Core Web Vitals): LCP < 2.5s on 4G, CLS < 0.1; images responsive (`srcset`, WebP/AVIF, width/height set),
  lazy-load below the fold, minimal client JS (hydrate only the language switcher and product sheet).
- Caching: `Cache-Control: public, s-maxage=…, stale-while-revalidate=…`; API purges CDN cache on menu publish.
- Accessibility: semantic headings, alt text from product names, sufficient contrast.

---

## Testing
- Vitest + Testing Library: cart math, selectors, KDS board logic, form schemas.
- RTK Query endpoints tested with MSW (mock service worker) where needed.
- Playwright e2e: signup → onboarding → product → public menu (check title, JSON-LD, hreflang);
  POS order → KDS shows it → ready.
