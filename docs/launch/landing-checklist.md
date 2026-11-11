# Landing page launch checklist (getsahtain.com)

Companion to `15-sahtain-landing-page.md`. The site lives in `apps/site`: the home page (`/ar`, `/en`) plus `/:locale/plans`, `/:locale/faq`, `/:locale/contact`, `/:locale/privacy`, `/:locale/terms` and the conversion page `/:locale/thanks`. `/` redirects by `Accept-Language`.

## 1. Environment

| Variable | Value | Notes |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://getsahtain.com` | Used for canonicals, hreflang, sitemap, Open Graph and JSON-LD. |
| `PUBLIC_API_URL` | the public API origin | Needed by the menu pages and the sitemap. |
| `PUBLIC_WHATSAPP_NUMBER` | digits with country code, e.g. `966501234567` | The chat button shown on every page. **Unset = a fictional placeholder number that reaches nobody.** |
| `PUBLIC_INSTAGRAM_URL`, `PUBLIC_FACEBOOK_URL` | full `https://` profile links | Footer icons. **Unset = placeholder links to the planned `@sahtain` profiles; set the real ones before launch.** |
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

- [ ] Cache Rule: **cache** every page except the two below (`/ar`, `/en`, and `/ar|en/plans`, `/faq`, `/contact`, `/privacy`, `/terms`) and respect the origin TTL.
- [ ] Rate-limit rule: `POST` to `/ar/contact` and `/en/contact` (for example 10 per minute per IP). The site limits each visitor to 3 requests per 10 minutes inside one process, and the API only sees the site server's address, so the CDN rule is the shared backstop. Forward the visitor's address (`CF-Connecting-IP`), which the form action uses for its limit.
- [ ] **Lock the origin to Cloudflare.** The form action trusts `CF-Connecting-IP` / `X-Forwarded-For` for its per-visitor limit, so the site server must accept traffic only from Cloudflare (firewall allow-list of Cloudflare's IP ranges, or authenticated origin pulls). Otherwise a bot that sends its own header value gets a fresh limit on every request and can use up the API's site-wide limit. Visitors with no forwarded address get no per-visitor limit (the honeypot and the API's site-wide limit still apply).
- [ ] Cache Rule: **bypass** `/` (the redirect depends on `Accept-Language`; Cloudflare does not vary on it, so a cached redirect would send everyone to one language) and `/*/thanks` (sends `no-store`).
- [ ] `/assets/*` (hashed by Vite): cache for a year, immutable.
- [ ] `/fonts/*`, `/landing/*` (not hashed): edge TTL 1 day, browser 1 week, and **purge the cache on each deploy** that changes them.
- [ ] Do not enable HTML minification or Rocket Loader (they can break hydration).
- [ ] The origin (`react-router-serve`) sends `Cache-Control: public, max-age=0` for files in `public/` and `application/octet-stream` for `.avif`. The two cache rules above fix the caching; make sure the CDN serves `.avif` as `image/avif` (Cloudflare does by extension). Lighthouse run against the origin alone will flag "efficient cache policy"; run it against the CDN URL for the real number.

## 4. Search

- [ ] Add the `getsahtain.com` domain property in Google Search Console (DNS TXT verification).
- [ ] Submit `https://getsahtain.com/sitemap.xml`.
- [ ] URL-inspect `/ar`, `/en` and one of each inner page (`plans`, `faq`, `contact`): indexable, canonical is the page itself, hreflang `ar`, `en` and `x-default` are detected.
- [ ] Confirm `/ar/thanks` and `/en/thanks` are **not** indexed (they send `noindex`; they are deliberately not blocked in `robots.txt` so crawlers can see it).
- [ ] Rich Results Test: `/ar` and `/en` (`Organization`, `WebSite`, `SoftwareApplication`), `/ar/plans` and `/en/plans` (`SoftwareApplication` with one `Offer` per plan), `/ar/faq` and `/en/faq` (`FAQPage`), `/ar/contact` and `/en/contact` (`ContactPage`) are valid.
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
- [ ] With consent given, open `/ar/thanks` right after sending the form: GA4 DebugView shows `generate_lead` and Meta Pixel Helper shows `Lead`. Opening any other page, or `/ar/thanks` directly, fires neither (the conversion needs the one-shot `sahtain_lead` cookie the form sets).
- [ ] With consent rejected, `/ar/thanks` fires nothing.
- [ ] Open `/ar?utm_source=google&utm_medium=cpc&gclid=test`, check `sessionStorage['sahtain_attribution']` holds the values, then send the form on `/ar/contact`: the lead row has `utm_source`, `utm_medium` and `gclid` filled in.

## 6b. Contact form and WhatsApp

- [ ] Send the form with valid data: you land on `/ar/thanks` (or `/en/thanks`), and a `leads` row exists. Read leads with the owner connection: `select created_at, name, restaurant_name, phone, email, country, branches, utm_source, gclid from leads order by created_at desc;` (the API user cannot read this table on purpose).
- [ ] Send it with a bad email (for example `a@b`): the same page shows the message under the field and keeps what you typed.
- [ ] Stop the API and send the form: a clear "could not send" message appears, nothing is lost.
- [ ] Send four valid forms within ten minutes from one address: the fourth is refused with the "too many requests" message.
- [ ] The WhatsApp button is visible on every page (home, plans, FAQ, contact, privacy, terms, thanks), in both languages, and lifts above the cookie banner while it is open.
- [ ] Set `PUBLIC_WHATSAPP_NUMBER`, restart, and click the button: WhatsApp opens a chat with the real number and the prefilled message.

## 7. Page quality gates

- [ ] Lighthouse mobile on the home page and on `/plans`: Performance >= 90, Accessibility >= 95, Best Practices and SEO = 100. Paste the numbers in the PR.
- [ ] LCP < 2.5 s, CLS < 0.1, INP < 200 ms on a throttled mobile profile.
- [ ] View source of every page shows the full content in HTML (server-rendered), exactly one `<h1>`, `lang`/`dir` set.
- [ ] Keyboard only: skip link, nav (current page marked), menu button, FAQ, consent buttons all reachable with a visible focus ring. The language switch keeps you on the same page.
- [ ] RTL check at 375, 768 and 1440 px; English check at the same widths.
- [ ] `prefers-reduced-motion`: the curved line is shown complete, videos show the poster only.

## 8. Needs a human before ad traffic

- [ ] Review the Arabic and English copy (all text is in `apps/site/app/features/landing/content/`).
- [ ] Legal review of `/privacy` and `/terms` (draft text).
- [ ] Confirm `hello@getsahtain.com` is a monitored mailbox (shown in the footer and used by the trial button).
- [ ] Replace the placeholder wordmark and icons when the logo exists (`public/icon-*.png`, `public/favicon.svg`, `public/landing/og-*.jpg`).
- [ ] Record an English-UI cut of the POS and kitchen videos (the page currently reuses the Arabic recording on `/en`).
- [ ] Set the real `PUBLIC_WHATSAPP_NUMBER` (the placeholder reaches nobody).
- [ ] Set `LEADS_NOTIFY_WEBHOOK_URL` on the API (a Slack, Discord or Mattermost incoming webhook) so each new lead posts a message with the restaurant, contact details and source. Without it, leads are stored only, so check the table before ad traffic starts. Send a test lead and confirm the message arrives.
