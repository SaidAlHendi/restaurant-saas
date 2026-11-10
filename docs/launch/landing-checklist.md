# Landing page launch checklist (getsahtain.com)

Companion to `15-sahtain-landing-page.md`. The page lives in `apps/site` (routes `/ar`, `/en`, `/:locale/privacy`, `/:locale/terms`, `/:locale/thanks`; `/` redirects by `Accept-Language`).

## 1. Environment

| Variable | Value | Notes |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://getsahtain.com` | Used for canonicals, hreflang, sitemap, Open Graph and JSON-LD. |
| `PUBLIC_API_URL` | the public API origin | Needed by the menu pages and the sitemap. |
| `PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | Optional. Empty = GA4 never loads. |
| `PUBLIC_GOOGLE_ADS_ID` | `AW-XXXXXXXXXX` | Optional. Empty = no Ads tag. |
| `PUBLIC_META_PIXEL_ID` | numeric pixel id | Optional. Empty = no pixel. |

Invalid IDs (wrong format) are ignored on purpose. Scripts load only after the visitor accepts the cookie banner.

## 2. DNS and hosting (`getsahtain.com`)

- [ ] Apex `getsahtain.com` points at the host that runs `react-router-serve` (or its load balancer).
- [ ] `www.getsahtain.com` is a CNAME to the apex and **301-redirects** to `https://getsahtain.com` (one canonical host).
- [ ] HTTPS everywhere (Cloudflare SSL mode "Full (strict)"); `http` redirects to `https`.
- [ ] `https://getsahtain.com/robots.txt` and `/sitemap.xml` load.

## 3. Cloudflare caching

HTML responses already send `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=600`.

- [ ] Cache Rule: **cache** `/ar`, `/en`, `/ar/privacy`, `/en/privacy`, `/ar/terms`, `/en/terms` and respect the origin TTL.
- [ ] Cache Rule: **bypass** `/` (the redirect depends on `Accept-Language`; Cloudflare does not vary on it, so a cached redirect would send everyone to one language) and `/*/thanks` (sends `no-store`).
- [ ] `/assets/*` (hashed by Vite): cache for a year, immutable.
- [ ] `/fonts/*`, `/landing/*` (not hashed): edge TTL 1 day, browser 1 week, and **purge the cache on each deploy** that changes them.
- [ ] Do not enable HTML minification or Rocket Loader (they can break hydration).
- [ ] The origin (`react-router-serve`) sends `Cache-Control: public, max-age=0` for files in `public/` and `application/octet-stream` for `.avif`. The two cache rules above fix the caching; make sure the CDN serves `.avif` as `image/avif` (Cloudflare does by extension). Lighthouse run against the origin alone will flag "efficient cache policy"; run it against the CDN URL for the real number.

## 4. Search

- [ ] Add the `getsahtain.com` domain property in Google Search Console (DNS TXT verification).
- [ ] Submit `https://getsahtain.com/sitemap.xml`.
- [ ] URL-inspect `/ar` and `/en`: page is indexable, canonical is the page itself, hreflang `ar`, `en` and `x-default` are detected.
- [ ] Confirm `/ar/thanks` and `/en/thanks` are **not** indexed (they send `noindex`; they are deliberately not blocked in `robots.txt` so crawlers can see it).
- [ ] Rich Results Test on `/ar` and `/en`: `FAQPage`, `SoftwareApplication`, `Organization`, `WebSite` are valid.
- [ ] Link the Google Business Profile (if one exists) to the same domain.

## 5. Ads accounts

- [ ] Link the Google Ads account to the GA4 property.
- [ ] In GA4 mark `generate_lead` as a key event and import it into Google Ads as the conversion.
- [ ] Meta Business: confirm the pixel belongs to the right ad account and the domain is verified.
- [ ] Ad copy matches the page: one clear call to action, free trial wording, the real plan prices.

## 6. Tag and consent tests (do these with the env vars set)

- [ ] Open `/ar` in a clean profile. **Before** clicking anything, the Network tab shows no request to `googletagmanager.com`, `google-analytics.com` or `connect.facebook.net`.
- [ ] Click "No, thanks": still no such requests, and the banner does not return on reload.
- [ ] Clear the `sahtain_consent` cookie, click "Accept": GA4 `page_view` and the Meta `PageView` fire.
- [ ] With consent given, open `/ar/thanks`: GA4 DebugView shows `generate_lead` and Meta Pixel Helper shows `Lead`. Opening any other page fires neither.
- [ ] With consent rejected, `/ar/thanks` fires nothing.
- [ ] Open `/ar?utm_source=google&utm_medium=cpc&gclid=test` and check `sessionStorage['sahtain_attribution']` holds the values (used by the lead form).

## 7. Page quality gates

- [ ] Lighthouse mobile: Performance >= 90, Accessibility >= 95, Best Practices and SEO = 100. Paste the numbers in the PR.
- [ ] LCP < 2.5 s, CLS < 0.1, INP < 200 ms on a throttled mobile profile.
- [ ] View source shows the full page in HTML (server-rendered), one `<h1>`, `lang`/`dir` set.
- [ ] Keyboard only: skip link, nav, menu button, FAQ, consent buttons all reachable with a visible focus ring.
- [ ] RTL check at 375, 768 and 1440 px; English check at the same widths.
- [ ] `prefers-reduced-motion`: the curved line is shown complete, videos show the poster only.

## 8. Needs a human before ad traffic

- [ ] Review the Arabic and English copy (all text is in `apps/site/app/features/landing/content/`).
- [ ] Legal review of `/privacy` and `/terms` (draft text).
- [ ] Confirm `hello@getsahtain.com` is a monitored mailbox (shown in the footer and used by the trial button).
- [ ] Replace the placeholder wordmark and icons when the logo exists (`public/icon-*.png`, `public/favicon.svg`, `public/landing/og-*.jpg`).
- [ ] Record an English-UI cut of the POS and kitchen videos (the page currently reuses the Arabic recording on `/en`).
- [ ] Lead form (name, restaurant, phone/WhatsApp, email, country, branches) and its API endpoint: pending, not shipped yet.
