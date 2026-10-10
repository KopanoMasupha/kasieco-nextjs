# KasiEco — Mzansi Business Digital Platform

A Next.js prototype where township shops **buy together, swap stock, and get
found by customers**. Trading features are gated on shop verification.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — that's it. No database setup needed; the app seeds
its own data on first run.

Optional: copy `.env.example` to `.env.local` and add `ANTHROPIC_API_KEY` for
Claude-generated stock summaries and help-bot answers. Both features also work
offline using built-in rules and product information.

## What changed since the first version

**A shared backend.** Shared platform data (shops, stock and sales, bulk-buy
pots and ledgers, exchange listings, funding, training, verification requests
and certificates) lives on the server in `data/db.json`, served through:
- `GET /api/state` — reads the current shared state
- `POST /api/action` — the only way to change it; every mutation runs through
  `lib/server/reducer.ts`, which also enforces the verification gate (see below)
  server-side, not just in the UI

Owner sign-in uses a phone number and PIN; shoppers browse without an account.
Customer ordering, payment and order history are not part of the prototype.

**Shared-pot bulk buying.** Verified shops can start or join a catalogue pot.
Contributions, rebates, refunds and payouts are recorded as append-only ledger
entries in integer cents. Shops see their quoted goods, delivery and service-fee
shares before paying; closing at the minimum rebates credits and pays the
supplier, driver and fee, while cancellation refunds contributions. The
payments are simulated—no real money is transferred or held—and each pot page
includes a ledger audit proof. The first contributor owns the pot and can close
or cancel it.

**Funding marketplace.** `/owner/funding` lists seeded South African funding
programmes, a five-question eligibility pre-check and application tracking.
The verifier portal can publish an opportunity. Confirm programme details and
deadlines with the official provider.

**Stock assistant and exchange.** My stock (`/owner/goods`) records sales and
estimates days of stock remaining, flags low and surplus stock, and suggests
nearby verified shops. Exchange offers use average listed shelf prices to show
the value difference and a suggested cash top-up; both shops must agree.

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

**Verification gates trading.** Unverified shops are hidden from customers and
cannot start or join a bulk-buy pot or post and respond to exchange listings.
These checks run in the server reducer.

**My stock** uses the sales log rather than customer orders. The rules-based
assistant (`lib/ai/insights.ts`) estimates sales pace and days of stock,
highlights stock-outs and surplus, and looks for a nearby verified shop that's
short of the same item. Claude can write the summary when `ANTHROPIC_API_KEY`
is set; otherwise a built-in summary is used.

**Landing and customer discovery.** `/` has a credited, rotating township
photo slideshow and a live shared-pot total. `/consumer` lets customers search
verified shops and in-stock items. Shop pages show prices, stock levels,
South-African-time opening status, directions, phone and available social links.
Customers visit the shop to buy; there is no online checkout.

**Help bot.** The help button on each page answers from the built-in product
guide and is explicit about features that are not available yet. Claude is
optional.

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
goods, see verified shops with stock and prices, check shop hours and contact
the shop. There is no basket, checkout or customer order history.

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
5. Open **Bulk buy** → a seeded pot. Show the price tiers, contribution
   breakdown, payment ledger and ledger proof. Use **Simulate another shop
   joining** to show repricing, then close a pot at its minimum or cancel one
   below minimum to demonstrate settlement and refunds. These payments are a
   sandbox simulation.
6. Visit **Funding** to complete the eligibility pre-check and track a
   programme; visit **My stock** to record a sale and see the stock assistant;
   visit **Exchange** to see nearby listings and an offer's price balance.
7. Visit `/verify` (code `GOV2026`) to show the compliance register, review
   queue, funding opportunity form and demo reset. The help button is available
   throughout; ask whether customers can order online.

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
- **Payments are simulated.** The ledger arithmetic and settlement rules run in
  the app, but no licensed payment gateway, trust account, real refund or real
  rebate is connected. A production deployment needs a regulated provider,
  webhooks and legal advice on holding client funds.
- **The JSON file is not a concurrent production database.** A persistent
  single-server host is suitable for the prototype; production needs a
  transactional database and proper access controls.
- **Some content is demo or externally hosted.** Funding programme details
  should be confirmed with providers; slideshow photos load from Wikimedia
  Commons and need an internet connection.

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
