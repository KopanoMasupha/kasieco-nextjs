# Kasi-Connect — Mzansi Business Digital Platform

A working Next.js prototype for both **consumers** and **shop owners**, now with a
real (if minimal) backend, a compliance/LMS verification flow, and AI-assisted
stock insights.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — that's it. No database setup needed; the app seeds
its own data on first run.

Optional: copy `.env.example` to `.env.local` and add `ANTHROPIC_API_KEY` if you
want the "AI stock insights" card on the owner dashboard to write its narrative
with Claude instead of the built-in plain-language template. Everything works
without it.

## What changed since the first version

**A real backend.** Shared platform data (shops, goods, orders, pools, exchange
listings, training sessions, verification requests, certificates) now lives on
the server in `data/db.json`, served through two API routes:
- `GET /api/state` — reads the current shared state
- `POST /api/action` — the only way to change it; every mutation runs through
  `lib/server/reducer.ts`, which also enforces the verification gate (see below)
  server-side, not just in the UI

Only per-browser session things — which role you're viewing as and which shop
you're "acting as" — stay in `localStorage`, the same as before. (The customer
side is browse-only now, so there's no basket or customer order history to keep.)

**Compliance & verification.** Registering a shop now leaves it in `draft`
status — invisible to customers, unable to trade — until it's verified one of
two ways:
1. **Take the free course** at `/owner/learn`: four short lessons on CIPC/SARS
   registration, the Certificate of Acceptability (Regulation R638), and
   municipal by-laws, then a 5-question quiz. Pass it (70%+) and the shop is
   verified immediately, with an animated certificate issued in the shop's
   name.
2. **Upload your own documents** at `/owner/compliance`: CIPC registration,
   Certificate of Acceptability, trading licence, etc. This puts the shop in
   `pending` status until a human decides.

**Government verifier portal** at `/verify` (demo access code: `GOV2026`).
Lists every pending submission with its documents, and lets a verifier approve
or reject with a note — every decision is kept in an audit trail
(`verificationRequests` in the DB). This is a stand-in for a real
government-side review queue; see "What's still a prototype" below.

**Government training sessions** at `/owner/training` — real, seeded sessions
run by the Wholesale & Retail SETA with Sefa (registration, food safety,
inventory, bookkeeping), which owners can register or cancel for.

**Verification gates everything**, not just pools: a non-verified shop cannot
appear on the consumer map or shop page, post or respond to an exchange
listing, join a bulk-buying pool, or receive orders. This is enforced in the
server reducer, so it can't be bypassed from the browser.

**AI stock insights** on the owner dashboard: a heuristic engine
(`lib/ai/insights.ts`) flags goods that are low on stock and selling, or
sitting unsold, and — for overstocked items — looks for a nearby *verified*
shop that's low on the same thing or has posted a "need" listing for it, so
you can offer it to them with one click. If `ANTHROPIC_API_KEY` is set, the
same data is turned into a short natural-language write-up by Claude; without
it, a template sentence does the same job.

**New landing page** at `/` — a marketing front door with a hero illustration, a
link through to the shopper shop finder, the three things the platform does
(Buy · Stock exchange · Discovery) and a compliance trust section showing how
many shops are verified vs. still in review. The map itself lives on `/consumer`
so the landing page stays a front door, not an app.

## Signing in and out (shop owners only)

Sign-in is for **shop owners**. Shoppers never sign in — the shop finder at
`/consumer` is open to everyone, with no account.

- **Owner login** at `/signin`: phone number + PIN → `/owner`. Owners can also
  **register** from there (or from `/owner/register`), which creates the account
  and signs them straight in.
- **Accounts** live in `data/db.json` (`accounts`) with PINs kept as SHA-256
  hashes and verified server-side in `app/api/auth/signin/route.ts`. The hash
  never reaches the browser: `/api/state` and `/api/action` strip the `accounts`
  array from every response.
- **Every seeded shop** uses the shared demo PIN **`1234`** — the sign-in page
  lists them (tap one to fill the form), served from `/api/auth/demo`.
- **Registering a shop asks you to choose a PIN** (`/owner/register`, step 1).
- **`/owner/*` is protected**: opening an owner page while signed out bounces you
  to `/signin?next=…` and back again after signing in. `/owner/register` stays
  open, since it's the sign-up.
- **Signing out** (`/signout`, or the nav's account menu) clears the browser
  session and shows a "you've been signed out" screen.
- **Shoppers** use the "I'm shopping" button / the shopper link on the landing
  page, which goes straight to the map + shop pages at `/consumer`.

## How to demo it

The nav's role toggle still switches between **"I'm shopping"** and
**"I own a shop"**. Shoppers need no account — "I'm shopping" drops you straight
onto the map and shop pages. "I own a shop" needs a signed-in owner account, so
it sends you to `/signin` (log in) or `/owner/register` (register). Sessions live
in `localStorage`, so two browsers (or one normal + one private window) let you
be two shops at once for the exchange demo. If a saved session points at a shop
that isn't in `data/db.json` any more, the app falls back to a real shop so
nothing dead-ends.

**The customer side ("I'm shopping") is browse-only.** Customers search for
goods, see which shops have stock and at what price, and can phone the shop —
there is no basket, checkout or customer order history. Buying happens in store.

A good walkthrough:
1. Land on `/`, note the "verified / in review" stat at the bottom, then click
   **I'm shopping** (or the "Find shops on the map" card) to see the shopper
   experience on `/consumer` — map, shops, stock and prices, no login.
2. Go back to `/` and click **Shop owner login** → tap **Thandi's Spaza** in the
   demo list → PIN `1234` → Sign in → Thandi's owner dashboard.
3. To demo a brand-new shop: **Register a shop** → register (choose your own PIN)
   → land on `/owner/compliance` → take the course at `/owner/learn` → pass the
   quiz → certificate + confetti → shop is now live on the map.
4. Use the account menu → **Sign out** → sign back in as a different demo shop
   (e.g. Sipho's Corner Store) to show two shops trading in the exchange.
5. Open `/owner/orders` to accept, reject or progress an existing order (orders
   are seeded demo data now that customers can't buy in-app) and `/owner` for the
   **AI stock insights** card.
6. Open `/verify` (code `GOV2026`) to show the government side: Lindiwe's
   Fresh Produce is seeded as `pending` with two documents ready to
   approve or reject.

## What's still a prototype (be upfront about this if asked)

- **Auth is local, not hardened.** Sign-in really checks an owner's phone number +
  SHA-256-hashed PIN against `data/db.json`, and `/owner/*` is gated on a
  signed-in owner — but there's no server session cookie (the session lives in
  `localStorage`), no password reset, no rate limiting, and the demo credentials
  are published on `/signin` on purpose. The verifier passcode is still a
  hardcoded demo string. Real auth (Supabase Auth or similar, with the verifier
  role properly separated from owner accounts) is the natural next step.
- **Uploaded documents aren't actually stored** — only the file name and any
  reference number you type. Real file storage (private, signed URLs) is
  needed before this touches real compliance documents.
- **No cross-checking against CIPC/municipal registers.** A verifier's
  approval is currently a judgement call from what's typed in, not an API
  lookup against the issuing authority.

## Hosting it for real

This app now has a genuine backend (the two API routes above), which changes
what "hosting" means compared to the first version.

**Easiest and most reliable for a hackathon demo: just run `npm run dev` on
your own laptop during judging.** Zero deploy risk, and the file-based database
persists for the whole session.

**If you want a real public link:**
- **Render.com (recommended for persistent data)** — a free Web Service on
  Render runs `next start` as a long-lived process, so `data/db.json` persists
  on its disk between requests exactly like it does locally. Push this project
  to a GitHub repo, create a new Web Service on Render pointing at it, set the
  build command to `npm install && npm run build` and the start command to
  `npm run start`, and optionally add `ANTHROPIC_API_KEY` as an environment
  variable.
- **Netlify (easiest link to share)** — the repo ships a `netlify.toml` plus
  `outputFileTracingIncludes` in `next.config.js`, so Netlify's Next.js runtime
  needs zero config: push to GitHub, then in Netlify choose "Add new site →
  Import an existing project", pick the repo, and accept the detected settings
  (`npm run build`, publish `.next`, `@netlify/plugin-nextjs`). Optionally add
  `ANTHROPIC_API_KEY` under Site settings → Environment variables. Everything
  works out of the box — sign-in (PIN `1234` for the demo shops), shop
  registration, the owner dashboard and the map all run on Netlify Functions,
  and the seeded `data/db.json` is bundled so the real shop list appears. The
  one caveat: serverless functions have an ephemeral filesystem, so *changes*
  made on the deployed site (new shops, PINs, stock updates) live only in the
  running function instance and reset when Netlify recycles it. Perfect for
  demos and reviewing the UI; use Render (or a real database) when you need
  deployed changes to survive.
- **Vercel** is the more familiar option for Next.js, but its serverless
  functions don't keep a writable, persistent filesystem between requests —
  `data/db.json` would reset unpredictably between cold starts. It'll run, but
  data won't reliably persist across users/tabs. Fine for showing the UI, not
  for a real multi-tab demo of the backend.

I can't create any of these deployments on your behalf — I don't have an
account to deploy to — but each takes under five minutes by hand from a pushed
GitHub repo.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
react-leaflet + OpenStreetMap tiles · canvas-confetti · a small JSON-file
backend (no database server to install) · optional Claude API call for the AI
insights narrative.
