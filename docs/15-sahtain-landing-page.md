# 15 — Sahtain landing page (design first, then build)

Claude Code prompt. Paste into Claude Code (CLI) with the `frontend-design` plugin enabled, run from the root of `restaurant-saas`, branch from `dev`.

---

## Goal

Design and build the public marketing landing page for **Sahtain (صحتين)** — restaurant POS + kitchen display + owner dashboard, domain `getsahtain.com`. It must look unique and designed, not like default AI output, and be ready for SEO and paid ads (Google/Meta).

Work in two phases. **Do not skip Phase 1.**

## Phase 1 — Design directions (no repo code yet)

1. Read: `apps/site/app/routes/home.tsx`, `locale-home.tsx`, `routes.ts`, `lib/seo.ts`, `lib/brand.ts`, `packages/ui` tokens, and the earlier prototype in `SaidAlHendi/sahtain-design` (`components/sahtain-landing.tsx`, `app/globals.css`) for brand colors and content only. Do not copy its layout wholesale.
2. Open these references in a browser, screenshot them, and note what makes them work (type scale, spacing, motion, how product screens are shown):
   - LIKE: https://www.nexdash.com — giant wordmark, pale canvas alternating with deep green, one statement per section, photographic and 3D imagery, restrained copy.
   - LIKE: https://lineaprompt.com — soft light page, large real product screens in rounded cards, thin lines connecting steps, scroll-driven reveals, honest comparison table, plain FAQ. Watch the animations (line drawing, card reveals, section transitions) and reproduce the feel, not the code.
   - LIKE: https://www.dirac.com — one problem statement, then a three-step explanation.
   - DISLIKE: https://iroom.devinthehood.com/example.html, https://handhold.io, https://zeeframes.com — template SaaS look.
3. Produce **3 distinct design directions** as static HTML mockups (desktop + mobile screenshots each), saved in `docs/design/landing/` (not in `apps/`). Each direction: palette, type pairing (Latin + Arabic), hero concept, how POS/KDS screens are shown, motion language. One of the three should be a bold NexDash-like wordmark direction; one a Linea-like product-led direction; one your own.
4. **Stop and wait for Said to pick one** before Phase 2.

## Hard design rules (all directions)

- **Avoid:** gradient headline text, blue/purple accents, rows of three icon cards, fake logo strips, placeholder prices like "€XX", generic stock gradients, emoji as icons, centered-everything layouts.
- **Brand colors (UPDATED 2026-11-10):** the brand is no longer forest green. Read the current palette from `packages/ui/src/styles/themes.css` on `dev` and use those tokens, not hardcoded hex. Light "Cosmic Latte" theme: cream canvas `#f3ecdf`, ivory cards `#fbf8f2`, mocha cream `#e8dcc6`, paprika-orange brand `oklch(55% 0.15 38)`, warm taupe accent `#b7ab9a`, espresso text `#2b1f1c`. Success/ready stays green. Dark sections should use the espresso end of this palette, not the old deep green. May introduce one distinctive extra accent, but it must sit well with paprika orange.
- **Reference note:** NexDash's deep green is a structure reference (light and dark section rhythm), not a color to copy. Translate it to Sahtain's warm palette.
- **Arabic first.** Arabic is the primary language; layout must be designed RTL-first, not mirrored as an afterthought. Choose a strong Arabic display face for the wordmark and headlines (e.g. from Google Fonts' Arabic set) and test it at hero size. Latin version `/en` must feel equally designed.
- **Imagery:** show **real product screens** (POS, KDS, owner dashboard) captured from `apps/web` with the demo seed, framed large. Food/kitchen photography may be used; no generic tech imagery.
- **Copy:** short declarative headlines, one idea per section. Write Arabic copy natively (not literal translation) and mark it for Said's review. No invented customer logos, testimonials, stats or prices. Pricing: show real plans only if the billing step defines them, otherwise "Contact us" / "Start free trial".
- **Motion:** purposeful and subtle (scroll reveals, connecting lines drawn on scroll, order-flows-from-POS-to-kitchen sequence). Respect `prefers-reduced-motion`. No motion may block content or hurt LCP.
- **Accessibility:** WCAG AA contrast, visible focus, keyboard navigable, logical heading order, `lang`/`dir` set per locale.

## Phase 2 — Build in `apps/site` (after Said picks a direction)

Stack is React Router 7 (SSR) + Vite + Tailwind in `apps/site`. Replace placeholder `routes/home.tsx` and `routes/locale-home.tsx`.

**Routes**
- `/` → redirect or negotiate to `/ar` (default) with correct status; `/ar` and `/en` are the real landing pages.
- `/:locale/privacy`, `/:locale/terms`, `/:locale/thanks` (conversion page, `noindex`).
- Keep existing menu routes untouched.

**Rendering and speed**
- Server-render all static sections; no `'use client'` for content. Use client JS only for small interactive bits (FAQ accordion, scroll motion).
- Self-host fonts (`font-display: swap`, subset Arabic + Latin, preload the hero font). Images in AVIF/WebP with width/height, `srcset`, hero `fetchpriority="high"`, others lazy.
- Target Lighthouse mobile ≥ 90 (Performance), 100 SEO/Best-practices, ≥ 95 Accessibility; LCP < 2.5s, CLS < 0.1, INP < 200ms.

**SEO**
- Per-locale unique `<title>` (≤ 60 chars) and meta description (≤ 155), canonical URL, `hreflang` for `ar`, `en`, `x-default`, `<html lang dir>`.
- Open Graph + Twitter card tags with a 1200×630 share image per locale (Arabic and English).
- JSON-LD: `Organization`, `WebSite`, `SoftwareApplication` (with offers only if real prices exist), `FAQPage` matching visible FAQ text.
- `sitemap.xml` with both locales and `xhtml:link` alternates; `robots.txt` (allow public pages, disallow `/t/`, thanks page `noindex`). Extend the existing `routes/sitemap[.]xml.tsx` and `robots[.]txt.tsx`.
- Semantic structure: one `<h1>`, ordered `h2`/`h3`, descriptive link text, alt text for every meaningful image, favicon/PWA icons, `theme-color`.
- Clean URLs, no trailing-slash duplicates, 301 for variants.

**Paid-ads readiness**
- Lead capture: a real "Request a demo / Start free trial" form (name, restaurant name, phone/WhatsApp, email, country, branches) posting to a new public API endpoint in `apps/api` (rate-limited, validated with zod, honeypot, stored in a `leads` table, with a migration and tests). No third-party form service.
- Consent banner (Arabic + English) that gates analytics/ad scripts until accepted.
- Tag hooks, **off by default** until env vars exist: `PUBLIC_GA4_ID`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_GOOGLE_ADS_ID`. Fire a `generate_lead` / `Lead` event on the `/thanks` page only.
- Capture `utm_*`, `gclid`, `fbclid` on first visit (first-party cookie or sessionStorage) and save them with the lead.
- Ad-friendly page: message match with a clear single call to action above the fold, fast mobile load, no pop-ups, visible Privacy/Terms/contact details, no unverifiable claims.
- Provide a short `docs/launch/landing-checklist.md`: Search Console + sitemap submit, Google Business/ads account links, pixel/GA4 test steps, domain `getsahtain.com` DNS notes, Cloudflare caching headers.

**Docs rule:** if behavior users see changes (new lead form, new routes), update the matching Mintlify docs pages in the same piece of work and ask before publishing.

## Verify before opening the PR

- `pnpm --filter @app/site typecheck lint test build` and the API tests for the leads endpoint all pass.
- Screenshots at 375, 768, 1440 px for `/ar` and `/en`; light RTL layout check (no mirrored icons that shouldn't mirror, correct numerals).
- Lighthouse mobile run with numbers pasted in the PR.
- Validate JSON-LD (Schema validator) and OG tags; show `view-source` proving content is server-rendered.
- Confirm tags do not fire before consent.

## PR

Target `dev`. Small, reviewable commits: (1) design mockups, (2) routes/layout/fonts, (3) sections, (4) SEO, (5) leads API + form, (6) consent + tags, (7) docs. In the PR description list what is placeholder (Arabic copy to review, share image, pricing) and which env vars Said must set.
