# 16 — Landing page media: photos + POS/KDS demo video

Claude Code prompt. Companion to `15-sahtain-landing-page.md`. Run it before or during Phase 2 of that prompt, from the root of `restaurant-saas` on a branch from `dev`.

## 1. The 5 photos

Said generated 5 food/kitchen photos and put them in the project's **assets** folder (likely `apps/site/public/assets/` or `assets/` — search for them with `ls`/`find` for recent `.png`/`.webp`/`.jpg`; if you cannot find exactly 5, stop and ask Said where they are, do not generate substitutes).

They are, in order: (1) Gulf table, top-down; (2) Levantine mezze table; (3) neutral modern table; (4) kitchen, chef's hands plating at the pass; (5) hands placing a plate beside an order ticket.

Known limits: they were generated at 1344×752, "low" quality, 16:9, with no 4:5 crops. Palette target: cream, paprika, espresso.

Do this:
1. Look at each one and tell Said honestly which are usable (real-looking food, palette fit, no garbled text or odd hands) and which are not.
2. Use them only where they earn a place: one or two warm photos in the dark/espresso sections so they feel less like software, and the kitchen ones near the POS-to-kitchen story. Do not put a photo in every section.
3. Optimize for the web: AVIF + WebP + fallback, width/height set, `srcset`, lazy-loaded below the fold, hero image `fetchpriority="high"`, meaningful Arabic and English `alt` text. Make mobile crops with `object-position` rather than new images.
4. If any is too soft at full width, use it smaller (a card or half-width), not as a full-bleed hero. Flag it to Said so he can regenerate.

## 2. The POS → kitchen demo video

A proof-of-concept already exists: `/mnt/project-files/landing-media/sahtain-pos-kds-demo.mp4` (17s, POS left, kitchen display right, order #18 sent and moved New → Preparing → Ready) made by `landing-media/scripts/record-pos-kds-demo.js`. It had no product photos and an English UI, so it is a placeholder. Record the real one on Said's machine:

1. `pnpm install`, start Postgres + Redis, apply `01-roles.sql`, `pnpm db:migrate`.
2. Seed **with images on** (the machine has Unsplash access): `pnpm db:seed:demo --reset` (see `apps/api/src/scripts/seed-demo/cli.ts`). Demo users: `cashier1@seed-cafe-qahwa.seed.local` and `kitchen1@seed-cafe-qahwa.seed.local`, password = `SEED_PASSWORD` from `.env`.
3. Before recording, cancel leftover active seed orders (status placed/preparing/ready) so the kitchen board starts empty and the new ticket is alone on screen.
4. Adapt `record-pos-kds-demo.js` (Playwright, two browser contexts with `recordVideo`, stitched with `ffmpeg hstack`):
   - Record the **Arabic RTL** UI (`ar`), since the landing page is Arabic-first; also export an English cut.
   - Pick products that have photos and no option dialogs; 3 to 4 items, a customer name, then "Send to kitchen".
   - Keep steady 1 to 1.5 s pauses: add items, send, ticket appears, Start, Ready.
   - Output: 8 to 12 s trimmed MP4 (H.264, `-crf 22`, no audio, `+faststart`), a WebM/AV1 version, and a poster frame. Also export each screen **separately** (POS-only, KDS-only) in case the design needs them apart.
5. Embed on the page as a muted, looping, `playsinline` video with a poster image, `preload="metadata"`, lazy-loaded, and `prefers-reduced-motion` showing the poster only. The video must never be the LCP element; use the poster image for LCP.
6. Keep video files small (target under 1.5 MB for the hero cut). Put sources in `docs/design/landing/media/`, optimized outputs in `apps/site/public/`.

## Rules

- Do not use AI-generated video of the product screens (it invents fake interface text). Only real recordings.
- No customer names or real data in the recording: demo seed only.
- Report file sizes and show Said one screenshot per final asset before the PR.
