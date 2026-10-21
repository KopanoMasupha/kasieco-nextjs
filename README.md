# MzansiConnect

**Township shops buy stock together, pay less, and get it delivered.**

MzansiConnect lets spaza shops, tuckshops and general dealers in Tshwane's townships (Mamelodi, Soshanguve, Ga-Rankuwa, Atteridgeville) club together on bulk deals from partner wholesalers.

The deal works like this:
- **Reserve free.** A shop reserves units in a deal. Nothing is paid yet.
- **The price drops as more shops join.** When the lot is full, the price locks at the lowest step.
- **Pay when full.** Every shop has 48 hours to pay its share into **TradeSafe escrow**. MzansiConnect never holds shop money.
- **Delivered.** An admin checks the payments, a second admin approves paying the wholesaler, and drivers deliver to every shop. Each shop hands over a 4-digit code on delivery.

The prototype also covers:
- shop registration with a required compliance quiz;
- a first-visit, 14-step owner tour with Thuli, replayable from the Home page;
- a "Due now" summary on the owner dashboard, with direct payment links for full deals;
- a stock dashboard;
- a funding marketplace;
- a "willing buyer & seller" exchange between shops;
- shop-to-shop courier bookings with shared fees, delivery codes and driver payouts;
- a public shop finder;
- a help bot with suggested questions and links into the app;
- full admin and driver apps.

> This is a hackathon prototype. The money maths, every business rule and the step order are real and tested (`npm test`, 139 checks). TradeSafe payments, SMS and road routing are **simulated**. See [What's real and what's simulated](#18-whats-real-and-whats-simulated).

---

## Contents

1. [Quick start](#1-quick-start)
2. [Requirements](#2-requirements)
3. [Packages and why each one is needed](#3-packages-and-why-each-one-is-needed)
4. [Rebuilding the project from an empty folder](#4-rebuilding-the-project-from-an-empty-folder)
5. [Configuration files](#5-configuration-files)
6. [Environment variables](#6-environment-variables)
7. [npm scripts](#7-npm-scripts)
8. [Demo accounts](#8-demo-accounts)
9. [Project structure](#9-project-structure)
10. [Architecture: how data flows](#10-architecture-how-data-flows)
11. [The payment model: TradeSafe escrow, pay when full](#11-the-payment-model-tradesafe-escrow-pay-when-full)
12. [The life of a deal](#12-the-life-of-a-deal)
13. [Registration requires the compliance quiz](#13-registration-requires-the-compliance-quiz)
14. [Showing the discount clearly](#14-showing-the-discount-clearly)
15. [Adding a new feature (worked example)](#15-adding-a-new-feature-worked-example)
16. [Design system](#16-design-system)
17. [Tests](#17-tests)
18. [What's real and what's simulated](#18-whats-real-and-whats-simulated)
19. [The single-file offline prototype](#19-the-single-file-offline-prototype)
20. [Deploying](#20-deploying)
21. [Troubleshooting](#21-troubleshooting)
22. [Roadmap to production](#22-roadmap-to-production)

---

## 1. Quick start

```bash
git clone <your-repo-url> mzansiconnect
cd mzansiconnect
npm install
npm run dev
```

Open **http://localhost:3000** and sign in with any [demo account](#8-demo-accounts). Every PIN is `1234`.

- The first request creates `data/db.json` and fills it with demo shops, wholesalers, drivers and five deals, each at a different step.
- To start fresh, sign in as an admin and press **Reset the demo** at the bottom of the Overview. You can also stop the server and delete the `data/` folder.

---

## 2. Requirements

| Tool | Version | Check with |
|---|---|---|
| Node.js | **18.18 or newer** (20 or 22 LTS recommended) | `node -v` |
| npm | 9 or newer (comes with Node) | `npm -v` |
| Git | any recent version | `git --version` |
| A modern browser | Chrome, Edge, Firefox or Safari | — |

No database server, no Docker and no accounts are needed. The data is a JSON file on disk.

**Windows:** use PowerShell or the VS Code terminal. Every command here works the same.

---

## 3. Packages and why each one is needed

### Runtime dependencies

| Package | Version | What it's used for |
|---|---|---|
| `next` | ^14.2.35 | The framework: App Router pages in `app/`, API routes in `app/api/`, dev server and production build |
| `react`, `react-dom` | ^18.3.1 | UI library |
| `framer-motion` | ^11.3.24 | Animations: the sign-in scene, the price ladder bars growing, modals, page transitions |
| `lucide-react` | ^1.47.0 | All icons (`<TrendingDown />`, `<ShieldCheck />`, …) |
| `clsx` | ^2.1.1 | Building conditional class names: `clsx("btn", active && "chip-active")` |
| `leaflet` | ^1.9.4 | Maps for the shop finder and the location picker at registration |
| `react-leaflet` | ^4.2.1 | React components for Leaflet (`<MapContainer>`, `<Marker>`) |
| `canvas-confetti` | ^1.9.3 | Confetti when a deal fills or a shop passes the quiz |

### Development dependencies

| Package | Version | What it's used for |
|---|---|---|
| `typescript` | ^5.5.4 | Type checking; the whole codebase is TypeScript |
| `@types/node`, `@types/react`, `@types/react-dom` | 20 / 18 | Types for Node and React |
| `@types/leaflet`, `@types/canvas-confetti` | latest | Types for those two libraries |
| `tailwindcss` | ^3.4.6 | Styling; all design tokens live in `tailwind.config.ts` |
| `postcss`, `autoprefixer` | ^8.4 / ^10.4 | Tailwind's CSS pipeline |
| `tsx` | ^4.19.2 | Runs the TypeScript test script directly (`npm test`) |
| `esbuild` | ^0.23.1 | Bundles the single-file offline prototype (`npm run build:prototype`) |

### Optional, for browser screenshots and click-through checks

These aren't in `package.json`. Install them only if you want to script the UI:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

### Install everything in one go

`npm install` reads `package.json` and installs all of the above. If you're adding them to a fresh project by hand:

```bash
npm install next@14 react@18 react-dom@18 framer-motion@11 lucide-react clsx leaflet@1.9 react-leaflet@4 canvas-confetti

npm install --save-dev typescript @types/node@20 @types/react@18 @types/react-dom@18 \
  @types/leaflet @types/canvas-confetti tailwindcss@3 postcss autoprefixer tsx esbuild@0.23
```

> **Pin `react-leaflet@4`.** Version 5 needs React 19, and this project uses React 18.

---

## 4. Rebuilding the project from an empty folder

Normally you just clone the repo. These steps show how the skeleton was put together, which helps if you're starting a sibling project:

```bash
npx create-next-app@14 mzansiconnect --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
cd mzansiconnect
npm install framer-motion@11 lucide-react clsx leaflet@1.9 react-leaflet@4 canvas-confetti
npm install --save-dev @types/leaflet @types/canvas-confetti tsx esbuild@0.23
mkdir -p lib/server components data scripts
```

Then add the files described in [Project structure](#9-project-structure). The heart of it is three pieces:
- one reducer (`lib/server/reducer.ts`);
- one action type (`lib/server/actions.ts`);
- two API routes (`app/api/state`, `app/api/action`).

---

## 5. Configuration files

### `package.json` (scripts and engines)

```json
{
  "name": "mzansiconnect",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "tsx scripts/test-flow.ts",
    "build:prototype": "node prototype/build.mjs"
  },
  "engines": { "node": ">=18.18" }
}
```

### `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
module.exports = nextConfig;
```

### `tsconfig.json`

The `@/*` alias lets every file import from the project root: `import { formatCents } from "@/lib/pot"`.

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "prototype"]
}
```

### `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: { 50: "#FBF7F1", 100: "#F1ECE4", 200: "#EAE0CE", 300: "#DCCBAE" },
        ink: "#171310",
        ember: { DEFAULT: "#E85D2B", dark: "#C4471C" },
        leaf: "#2F6D4F",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1rem", xl3: "1.5rem" },
    },
  },
  plugins: [],
};
export default config;
```

### `postcss.config.js`

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

### `.gitignore` (the important lines)

```
node_modules
.next
.env*.local
data/            # the JSON database: created on first run, never committed
prototype/dist/  # the built offline prototype
```

---

## 6. Environment variables

Everything works with **no environment variables at all**. The AI features fall back to built-in rules.

```bash
cp .env.example .env.local
```

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | If set, the stock assistant summary and the help bot answers are written by Claude. Without it, templates and a built-in knowledge base are used. |
| `ANTHROPIC_MODEL` | No | Model override. Defaults to `claude-sonnet-5-5`. |

The call lives in `lib/server/claude.ts`. It returns `null` on any failure, so callers always fall back to the rule-based text:

```ts
export async function askClaude(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens = 400) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: maxTokens, system, messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content?.find((c: any) => c.type === "text")?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
```

---

## 7. npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 with hot reload |
| `npm run build` | Production build (type-checks every page) |
| `npm start` | Serves the production build (`npm start -- -p 4000` for another port) |
| `npm test` | Runs 139 end-to-end checks of the business rules. No server or browser needed |
| `npm run build:prototype` | Builds `prototype/dist/mzansiconnect-prototype.html`, the whole app in one offline file |
| `npm run lint` | Next.js ESLint |

---

## 8. Demo accounts

Every account uses **PIN `1234`**. The sign-in page has a **Demo accounts** panel: tap a name to fill it in.

| Role | Name | Phone | Good for showing |
|---|---|---|---|
| Owner | Thandi Nkosi, Thandi's Spaza (Mamelodi) | **071 234 5678** | Main owner demo. Sugar deal: **"Deal full — your turn to pay"** |
| Owner | Sipho Dlamini, Sipho's Corner Store (Mamelodi) | 082 345 6789 | Also unpaid on sugar; reserving on cooking oil |
| Owner | Kgomotso Mokoena, General Dealer (Ga-Rankuwa) | 072 111 4455 | Missed delivery, rice waiting at a drop point, **drop-point fee due** |
| Owner / drop point | Tebogo Molefe, Tebogo's Tuckshop (Ga-Rankuwa) | 073 222 5566 | On the sugar **waitlist**; drop-point page and earnings |
| Owner | Bongani Zulu, Bongani's Tuckshop (Soshanguve) | 084 678 9012 | Another verified shop |
| Owner (not verified) | Lindiwe Khumalo, Lindiwe's Fresh Produce | 079 567 8901 | Can browse, can't join deals until verified |
| **Admin 1** | Zanele Dube, deals & money | **060 100 0001** | Payments, ordering, asking for approval |
| **Admin 2** | Lindiwe Sithole, deliveries & drivers | **060 100 0003** | Approving Zanele's requests, booking drivers |
| Driver | Thabo Mokoena, 1-ton bakkie | **081 400 1001** | Rice trip in progress |
| Driver | Lerato Khumalo, 4-ton truck | 081 400 1002 | |
| Driver | Sizwe Ndlovu, panel van | 081 400 1003 | |
| Driver | Naledi Mahlangu, 8-ton truck | 081 400 1004 | |
| Verifier | Dept. of Small Business Development | 060 100 0002 | Approving documents, posting funding |

### Seeded deals

The demo data is produced by **replaying real actions through the reducer** (`lib/server/seedDb.ts`), so every deal balances.

| Deal | Wholesaler | Step | Use it to show |
|---|---|---|---|
| Cake flour 10 kg | Mzansi Grain Traders | Delivered | Full history, pot at R0, everyone paid |
| Long-grain rice 10 kg | Mzansi Grain Traders | On the way | Driver flow; Kgomotso's stock at Tebogo's drop point |
| White sugar 2 kg | Highveld Milling | **Full · pay** | Pay with TradeSafe, the 48-hour window, waitlist, releasing unpaid spots |
| Maize meal 5 kg | Highveld Milling | Joining | Reserving free; price ladder |
| Cooking oil 750 ml | Kasi Wholesalers | Joining (21 / 30) | The discount hero: ~~R350~~ → R295, 16% off |

---

## 9. Project structure

```
mzansiconnect/
├── app/                              # Next.js App Router: one folder per URL
│   ├── layout.tsx                    # fonts, <StoreProvider>, <AppShell>
│   ├── globals.css                   # Tailwind layers + .card, .btn, .chip, .eyebrow …
│   ├── page.tsx                      # landing: slideshow, how it works, find a shop / register
│   ├── signin/page.tsx               # one sign-in for every role (phone + PIN)
│   ├── consumer/                     # public shop finder (map) and shop pages
│   ├── owner/
│   │   ├── page.tsx                  # owner home: due now, in escrow, savings, stock chart
│   │   ├── register/page.tsx         # 4-step registration; step 4 is the quiz
│   │   ├── pools/page.tsx            # "Buy": every open deal
│   │   ├── pools/[id]/page.tsx       # one deal: DealPriceHero, pay card, tracker, delivery
│   │   ├── payments/page.tsx         # to pay, in escrow, history (replaces the old wallet)
│   │   ├── partner/page.tsx          # drop point: hand-overs and earnings
│   │   ├── exchange/[threadId]/page.tsx # shop-to-shop messages, offers and courier booking
│   │   ├── stock/ exchange/ funding/ compliance/ learn/ training/
│   ├── admin/
│   │   ├── page.tsx                  # to-dos, deals by step, TradeSafe reconciliation
│   │   ├── deals/page.tsx            # deals grouped by what needs doing
│   │   ├── deals/new/page.tsx        # publish a deal
│   │   ├── deals/[id]/page.tsx       # control room: payments → approve → plan → book
│   │   ├── drivers/page.tsx
│   │   └── team/page.tsx             # two-admin approvals record
│   ├── driver/                       # deal trips and shop-to-shop courier runs
│   ├── verify/page.tsx               # government verifier portal
│   ├── inbox/page.tsx                # messages for everyone
│   └── api/
│       ├── state/route.ts            # GET  → whole public state
│       ├── action/route.ts           # POST → run one action through the reducer
│       └── ai/{chat,report}/route.ts # help bot and stock assistant (optional Claude)
│
├── components/
│   ├── deal/      DealPriceHero, JoinDealModal, DealTracker, DeliveryChoices, MyDeliveryCard
│   ├── pay/       DealPaymentCard, TradeSafeCheckout
│   ├── pot/       PoolCard, PotMeter, MemberTable, LedgerFeed, LedgerProof
│   ├── admin/     ApprovalPanel, DeliveryPlanner, RouteSketch, MessageAssistant
│   ├── exchange/  CourierCard
│   ├── driver/    StopCard, CourierRunCard
│   ├── maps/      ShopFinderMap, LocationPicker, leafletIcons
│   ├── AppShell.tsx  NavBar.tsx  SignIn.tsx  SignInScene.tsx  RegistrationQuiz.tsx
│   ├── StockChart.tsx  HelpBot.tsx  Certificate.tsx  TownshipSlideshow.tsx  Skeleton.tsx …
│
├── lib/
│   ├── types.ts          # every data type + constants (PAYMENT_WINDOW_HOURS, fees, DEAL_STEPS)
│   ├── pot.ts            # deal money maths: prices, shares, pledge, pay, lock, cancel, audit
│   ├── payments.ts       # TradeSafe payment records: what's due, in escrow, history
│   ├── reconcile.ts      # platform-wide "every rand accounted for" check
│   ├── planner.ts        # delivery planner: groups, vehicles, stop order, time slots
│   ├── delivery.ts       # drop points nearby, delivery-choice summaries
│   ├── courier.ts        # shop-to-shop distance, quote and driver selection
│   ├── store.tsx         # client state, dispatch(), useMe(), useMyShop(), live refresh
│   ├── seed.ts           # demo shops, wholesalers, drivers, accounts, deal templates
│   ├── helpbot.ts  messageDrafts.ts  compliance.ts  funding.ts  exchange.ts  geo.ts …
│   └── server/
│       ├── actions.ts    # the ServerAction union: every action the server accepts
│       ├── reducer.ts    # THE rules: reduce(db, action) → { db, meta }
│       ├── db.ts         # JSON file database, publicState(), sign-in lookup, reset
│       ├── seedDb.ts     # builds demo data by replaying actions
│       └── claude.ts     # optional Claude call
│
├── scripts/test-flow.ts  # 139 end-to-end checks (npm test)
├── prototype/            # single-file offline build (entry.tsx, shims/, build.mjs)
├── data/db.json          # created at runtime (git-ignored)
├── render.yaml           # one-click Render deploy
└── .env.example
```

### Owner dashboard and guided tour

The owner Home page shows the amount due now, deal payment deadlines, TradeSafe escrow and stock information. A payment row opens checkout for that deal. New owners see a guided tour with Thuli on their first Home visit; **Show me around** replays it later.

### MzansiConnect helper

The floating helper opens from any role's app shell. It offers suggested questions, answers from the built-in knowledge base, and links to relevant pages. When `ANTHROPIC_API_KEY` is configured, the chat route can use Claude; otherwise it uses the local knowledge base.

### Admin dashboard layout

The admin Overview prioritizes actionable items in **Needs you**, then shows deals by workflow step and TradeSafe reconciliation. Pipeline rows keep long labels and product names from pushing the count badges out of alignment, including on narrow screens.

---

## 10. Architecture: how data flows

```
 Browser (React)                              Server (Next.js API routes)
 ───────────────                              ───────────────────────────
 useStore().dispatch({ type: "PAY_DEAL", … })
        │  POST /api/action  ───────────────►  readDB()           data/db.json
        │                                       reduce(db, action) ← all rules live here
        │                                       writeDB(next)      (atomic write)
        │  ◄─────────────── { state, meta }     publicState(next)  ← PINs stripped
 setShared(state); show meta.error or success

 useLiveRefresh(3000) ── GET /api/state every 3 s, so other users' changes appear live
```

**Three ideas hold the whole app together:**

1. **One reducer.** Every change is an action, and `reduce(db, action)` is the only code that changes data. Rules (who may join, step order, the two-admin rule, payment windows) are enforced there, never in the UI.
2. **Integer cents.** All money is whole cents (`R295.00` → `29500`). Splits use a largest-remainder method (`allocate()` in `lib/pot.ts`), so shares always add up to the cent.
3. **Append-only ledgers.** A deal's `ledger` and the platform's `payments` are only ever appended to. Balances are re-proven by replaying them (`auditPot`, `reconcile`).

### The action route (`app/api/action/route.ts`)

```ts
import { NextResponse } from "next/server";
import "@/lib/server/seedDb"; // registers the demo seed
import { readDB, writeDB, publicState, resetDB } from "@/lib/server/db";
import { reduce } from "@/lib/server/reducer";
import { ServerAction } from "@/lib/server/actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let action: ServerAction;
  try {
    action = (await req.json()) as ServerAction;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (action.type === "RESET_DEMO") return NextResponse.json({ state: publicState(resetDB()), meta: {} });
  const db = readDB();
  const { db: nextDB, meta } = reduce(db, action);
  writeDB(nextDB);
  return NextResponse.json({ state: publicState(nextDB), meta });
}
```

### The state route (`app/api/state/route.ts`)

```ts
import { NextResponse } from "next/server";
import "@/lib/server/seedDb";
import { readDB, publicState } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicState(readDB()));
}
```

### The database (`lib/server/db.ts`)

```ts
export interface SharedDB {
  version: number;
  users: UserAccount[];
  shops: Shop[];
  goods: Good[];
  wholesalers: Wholesaler[];
  drivers: Driver[];
  pools: Pool[];          // the deals
  payments: PaymentTx[];  // TradeSafe's record: shop payments, refunds, drop-point payouts
  fees: Fee[];            // drop-point and re-delivery fees owners owe
  trips: Trip[];
  messages: Message[];
  approvals: Approval[];
  // … listings, threads, training, verification, certificates, courses, funding
}

// Bump when the shape changes so an old data/db.json is replaced, not misread.
export const DB_VERSION = 7;

/** What a browser is allowed to see: everything except sign-in PINs. */
export function publicState(db: SharedDB): SharedDB {
  return { ...db, users: db.users.map(({ pin, ...rest }) => rest) };
}
```

If `data/db.json` has an older `version`, it is thrown away and re-seeded. **Bump `DB_VERSION` whenever you change the shape of `SharedDB`.**

### Using the store in a component

```tsx
"use client";
import { useStore, useMyShop } from "@/lib/store";

export default function PayButton({ dealId }: { dealId: string }) {
  const { dispatch } = useStore();
  const shop = useMyShop();

  async function pay() {
    const res = await dispatch({ type: "PAY_DEAL", dealId, shopId: shop!.id, method: "eft" });
    if (res.error) alert(res.error);   // the reducer's plain-words reason
    else console.log("Paid, ref", res.ref);
  }
  return <button className="btn-ember" onClick={pay}>Pay with TradeSafe</button>;
}
```

Hooks in `lib/store.tsx`:

| Hook | Returns |
|---|---|
| `useStore()` | `{ state, dispatch, loading, refresh }` |
| `useMe()` | The signed-in `UserAccount` (or `undefined`) |
| `useMyShop()` | The signed-in owner's `Shop` |
| `useMyDriver()` | The signed-in driver's `Driver` |
| `useInbox()` | Messages for the signed-in user, plus the unread count |
| `useLiveRefresh(ms)` | Re-fetches `/api/state` every `ms` milliseconds |

Only the signed-in identity is kept per browser, in `localStorage` (`kasieco-session-v6`). Everything else is on the server.

---

## 11. The payment model: TradeSafe escrow, pay when full

**MzansiConnect never holds shop money.** There is no wallet. Shops pay their share straight into a **TradeSafe escrow** account tied to the deal, and TradeSafe releases it to the wholesaler and drivers when MzansiConnect instructs it to. This keeps MzansiConnect outside SARB e-money and deposit-taking rules.

### The rules

| Moment | What happens | Money moves? |
|---|---|---|
| Shop reserves units | Units are added to the deal (`JOIN_DEAL`) | **No.** Pay today R0 |
| Last unit reserved | Price **locks** at the lowest step, and the payment window opens: **48 hours** (`PAYMENT_WINDOW_HOURS`) | No |
| Shop pays (EFT, card or cash at a till) | Pays exactly units × locked price + delivery share + 2% fee into escrow (`PAY_DEAL`) | Yes: shop → TradeSafe |
| Window ends with unpaid shops | Admin presses **Release unpaid spots**. Unpaid shops are dropped, the **waitlist** moves up, and the deal reopens if it's short (`ADMIN_RELEASE_UNPAID`) | No |
| Everyone has paid | Admin checks and confirms (`ADMIN_CONFIRM_PAYMENTS`) | No |
| Order placed (2 admins) | TradeSafe pays the wholesaler units × final price | Yes: escrow → wholesaler |
| Each stop delivered | That stop's share of transport goes to the driver | Yes: escrow → driver |
| Last delivery | The 2% service fee goes to MzansiConnect, and the pot ends at **R0** | Yes: escrow → MzansiConnect |
| Deal cancelled, nobody paid | Closes straight away, **no second admin needed** | No |
| Deal cancelled after payments | Two admins approve, then TradeSafe refunds each shop's bank exactly what it paid | Yes: escrow → shop |

Because shops only pay once the lot is full, **deals that don't fill never touch the bank**. That means no refunds and no chargeback pattern that could get the account flagged.

### What a shop pays (`lib/pot.ts`)

```ts
/** The unit price that applies right now: locked once the deal has filled. */
export function unitCentsFor(pool: PoolMoneyInputs, totalQty: number) {
  return pool.priceLockedCents ?? toCents(tierFor(pool.tiers, totalQty).price);
}

/** What every member owes for a given set of commitments. */
export function computeShares(pool: PoolMoneyInputs, commitments: PoolCommitment[]): ShareBreakdown[] {
  const totalQty = commitments.reduce((s, c) => s + c.qty, 0);
  const unitCents = unitCentsFor(pool, totalQty);
  const delivery = allocate(pool.deliveryFeeCents, commitments.map((c) => c.qty)); // split to the cent
  return commitments.map((c, i) => {
    const goodsCents = c.qty * unitCents;
    const serviceCents = Math.round(goodsCents * pool.serviceFeeRate); // 2%
    return { ...c, goodsCents, deliveryCents: delivery[i], serviceCents, owedCents: goodsCents + delivery[i] + serviceCents };
  });
}
```

### Reserving, locking and paying

```ts
/** A shop reserves units while the deal fills. No money moves. */
export function applyPledge(pool: Pool, shop: { id: string; name: string; township: string }, addQty: number) {
  if (pool.status !== "open") return { error: "This deal is full — join the waitlist instead." };
  if (!Number.isInteger(addQty) || addQty < 1) return { error: "Choose at least 1 unit." };
  const remaining = pool.minQty - totalQtyOf(pool);
  if (addQty > remaining) return { error: `Only ${remaining} left in this deal.` };
  // … add or top up this shop's commitment
}

/** The lot is fully reserved: lock the price and open the payment window. */
export function lockAtTarget(pool: Pool, windowHours: number): Pool {
  const now = Date.now();
  return {
    ...pool,
    status: "target-reached",
    priceLockedCents: pool.priceLockedCents ?? unitCentsFor(pool, totalQtyOf(pool)),
    targetReachedAt: pool.targetReachedAt ?? new Date(now).toISOString(),
    paymentDueAt: new Date(now + windowHours * 3600000).toISOString(),
  };
}

/** A shop pays its full share into escrow (through TradeSafe). */
export function applyPayment(pool: Pool, shopId: string, method: PaymentMethodKind, ref?: string) {
  if (pool.status !== "target-reached")
    return { error: pool.status === "open" ? "You pay when the deal is full — nothing is due yet." : "This deal isn't taking payments." };
  const pos = memberPositions(pool).find((m) => m.shopId === shopId);
  if (!pos) return { error: "You're not in this deal." };
  if (pos.dueCents <= 0) return { error: "You've already paid for this deal." };
  const r = ref || paymentRef(); // e.g. TS-7F3K2Q — same ref in the pot and in TradeSafe's record
  const ledger = appendTx(pool.ledger, { type: "contribution", shopId, amountCents: pos.dueCents, method, /* … */ ref: r });
  return { pool: { ...pool, ledger }, paidCents: pos.dueCents, ref: r };
}
```

### The `PAY_DEAL` rule in the reducer

```ts
case "PAY_DEAL": {
  const pool = db.pools.find((p) => p.id === action.dealId);
  if (!pool) return fail(db, "Deal not found");
  const res = applyPayment(pool, action.shopId, action.method);
  if ("error" in res) return fail(db, res.error);
  const shopName = pool.commitments.find((c) => c.shopId === action.shopId)!.shopName;
  const p = withEvent(res.pool, `${shopName} paid ${formatCents(res.paidCents)} into TradeSafe escrow.`, shopName);
  let next: SharedDB = {
    ...replacePool(db, p),
    payments: appendPayment(db.payments, {
      shopId: action.shopId, type: "deal-payment", amountCents: res.paidCents,
      method: action.method, dealId: pool.id, note: `${pool.productName} — held in escrow until delivery`, ref: res.ref,
    }),
  };
  const unpaid = memberPositions(p).filter((m) => m.dueCents > 0).length;
  if (unpaid === 0) next = notify(next, [{ toRole: "admin", toId: "admin", dealId: p.id, text: `All shops have paid for ${p.productName}. Check and confirm the payments.` }]);
  return { db: next, meta: { ref: res.ref, paidCents: res.paidCents, allPaid: unpaid === 0 } };
}
```

### Payment records (`lib/types.ts`)

```ts
export type PaymentMethodKind = "eft" | "card" | "cash";
export const ESCROW_PROVIDER = "TradeSafe";
export const PAYMENT_WINDOW_HOURS = 48;

export type PaymentTxType =
  | "deal-payment" // shop → TradeSafe escrow, its share of a full deal
  | "fee-payment"  // shop → TradeSafe, a drop-point, re-delivery or courier fee
  | "refund"       // TradeSafe escrow → the shop's bank, because the deal was cancelled
  | "fee-payout"   // TradeSafe → a drop-point shop's bank, its R5-a-unit earnings
  | "courier-refund" // TradeSafe → a shop, a cancelled courier booking's paid share
  | "courier-payout"; // TradeSafe → the courier driver's bank after delivery

export interface PaymentTx {
  id: string;
  ref: string;
  shopId: string;
  type: PaymentTxType;
  amountCents: number; // always positive; direction comes from `type`
  method?: PaymentMethodKind;
  dealId?: string;
  feeId?: string;
  note: string;
  createdAt: string;
}

/** A charge an owner owes for a drop point, re-delivery or courier run. */
export interface Fee {
  id: string;
  kind: "drop-point" | "redelivery" | "courier";
  shopId: string;
  dealId?: string;
  courierJobId?: string;
  amountCents: number;
  toShopId?: string; // the drop point that earns it
  status: "due" | "paid" | "cancelled";
  // …
}
```

### Every rand accounted for (`lib/reconcile.ts`)

The admin Overview shows **"Balanced — matches TradeSafe's records"** only when this holds:

```
collected (deal and fee payments) = in escrow (deal pots and active courier fees) + released
released = wholesalers + drivers + MzansiConnect fee + deal and courier refunds + drop-point payouts + re-delivery fees
```

```ts
export function reconcile(payments: PaymentTx[], pools: Pool[], fees: Fee[]): Reconciliation {
  const sum = (f: (t: PaymentTx) => boolean) => payments.filter(f).reduce((s, t) => s + t.amountCents, 0);
  const collected = sum((t) => t.type === "deal-payment" || t.type === "fee-payment");
  const refunded = sum((t) => t.type === "refund");
  const courierRefunds = sum((t) => t.type === "courier-refund");
  const courierDriverPayouts = sum((t) => t.type === "courier-payout");
  const toDropPoints = sum((t) => t.type === "fee-payout");
  const courierHeld = sum((t) => t.type === "fee-payment" && fees.find((f) => f.id === t.feeId)?.kind === "courier") - courierRefunds - courierDriverPayouts;
  const redeliveryFees = sum((t) => t.type === "fee-payment" && fees.find((f) => f.id === t.feeId)?.kind === "redelivery");
  const out = (type: string) => pools.reduce((s, p) => s + p.ledger.filter((t) => t.type === type).reduce((a, t) => a + t.amountCents, 0), 0);
  const inEscrow = pools.reduce((s, p) => s + potBalance(p.ledger), 0) + courierHeld;
  const toWholesalers = out("payout-supplier");
  const toDrivers = out("payout-driver") + courierDriverPayouts;
  const platform = out("payout-platform");
  const released = toWholesalers + toDrivers + platform + refunded + courierRefunds + toDropPoints + redeliveryFees;
  const potsMatch = out("contribution") === sum((t) => t.type === "deal-payment") && out("refund") === refunded;
  return { collected, inEscrow, toWholesalers, toDrivers, fees: platform, refunded, courierRefunds, toDropPoints, courierDriverPayouts, redeliveryFees, released, potsMatch, ok: potsMatch && collected === inEscrow + released };
}
```

### Payment helpers (`lib/payments.ts`)

| Function | Returns |
|---|---|
| `dealsToPay(pools, shopId)` | Full deals this shop still owes money on |
| `feesDue(fees, shopId)` | Unpaid drop-point, re-delivery and transport fees |
| `amountDue(pools, fees, shopId)` | The total "Due now" figure |
| `heldInEscrow(pools, shopId)` | What this shop has in escrow right now |
| `earnedAsDropPoint(payments, shopId)` | Drop-point earnings paid out by TradeSafe |
| `hoursLeft(iso)`, `dueText(iso)` | Countdown text, e.g. "31 h left" |

### Shop-to-shop exchange transport

After an offer is accepted in Willing buyer & seller, either participating shop can book a driver for a one-way delivery or a two-way swap. The booking records the route, day, time window and goods on each leg. The nearest available driver is assigned after all fee shares are paid.

The fee is R40 to call out plus R9 per estimated road kilometre, with a R50 minimum, rounded up to the nearest R5 and capped at 60 km. A two-way swap multiplies the estimate by 1.6. The booking shop can pay, ask the other shop to pay, or split the fee equally. Fees are held by TradeSafe until each receiving shop confirms hand-over with its four-digit code. Either shop can cancel before collection; any paid shares are refunded. Once a driver collects the goods, the run cannot be cancelled.

The reducer enforces booking eligibility, fee payment, driver assignment, collection order and delivery codes. These payment and routing effects are simulated in this prototype.

---

## 12. The life of a deal

`DEAL_STEPS` in `lib/types.ts` drives the 7-step tracker on every deal page:

| # | Status | Label | Who acts | Action(s) |
|---|---|---|---|---|
| 1 | `open` | Filling up | Owners reserve | `JOIN_DEAL` |
| 2 | `target-reached` | Payment due | Owners pay within 48 h; admin releases unpaid spots | `PAY_DEAL`, `ADMIN_RELEASE_UNPAID` |
| 3 | `payment-confirmed` | Payments checked | Admin checks | `ADMIN_CONFIRM_PAYMENTS` |
| 4 | `ordered` | Ordered | Admin asks, a **different** admin approves | `ADMIN_REQUEST_APPROVAL`, `ADMIN_DECIDE_APPROVAL` |
| 5 | `scheduled` | Scheduled | Admin books drivers from the planner | `ADMIN_ASSIGN_TRIPS` |
| 6 | `out-for-delivery` | On the way | Driver accepts, collects, delivers | `DRIVER_ACCEPT`, `DRIVER_COLLECT`, `DRIVER_DELIVER` |
| 7 | `delivered` | Delivered | Automatic after the last stop | — |
| — | `cancelled` | — | Admin (two admins if money was paid) | `ADMIN_REQUEST_APPROVAL` (`cancel-deal`) |

The server refuses any step out of order. For example, `ADMIN_CONFIRM_PAYMENTS` fails while any shop still owes money:

```ts
case "ADMIN_CONFIRM_PAYMENTS": {
  const pool = db.pools.find((p) => p.id === action.dealId);
  if (!pool) return fail(db, "Deal not found");
  if (pool.status !== "target-reached") return fail(db, "Payments can only be confirmed once the deal is full.");
  const unpaid = memberPositions(pool).filter((m) => m.dueCents > 0);
  if (unpaid.length) return fail(db, `${unpaid.length} shops haven't paid yet. Wait for the payment window, or release unpaid spots after it ends.`);
  if (!auditPot(pool).ok) return fail(db, "The ledger proof doesn't pass — don't confirm.");
  // … status → "payment-confirmed", owners notified
}
```

### Every action the server accepts (`lib/server/actions.ts`)

| Area | Actions |
|---|---|
| Sign-in & shops | `SIGN_IN`, `REGISTER_SHOP`, `UPDATE_SHOP` |
| Stock | `ADD_GOOD`, `UPDATE_GOOD`, `REMOVE_GOOD`, `RECORD_SALE` |
| Owners in deals | `JOIN_DEAL`, `PAY_DEAL`, `PAY_FEE`, `OWNER_SET_PREFS`, `OWNER_CONFIRM` |
| Drop points | `PARTNER_SETTINGS`, `PARTNER_HANDOVER` |
| Admin | `ADMIN_CREATE_DEAL`, `ADMIN_CONFIRM_PAYMENTS`, `ADMIN_RELEASE_UNPAID`, `ADMIN_REQUEST_APPROVAL`, `ADMIN_DECIDE_APPROVAL`, `ADMIN_ASSIGN_TRIPS`, `ADMIN_REBOOK`, `ADMIN_MARK_COLLECTED` |
| Drivers | `DRIVER_ACCEPT`, `DRIVER_COLLECT`, `DRIVER_DELIVER`, `DRIVER_MISSED`, `DRIVER_LEAVE_AT_PARTNER` |
| Messages | `SEND_MESSAGES`, `MARK_READ` |
| Exchange | `CREATE_LISTING`, `START_THREAD`, `SEND_MESSAGE`, `SEND_OFFER`, `RESPOND_OFFER`, `CONFIRM_HANDOVER`, `BOOK_COURIER`, `CANCEL_COURIER` |
| Shop-to-shop drivers | `COURIER_ACCEPT`, `COURIER_COLLECT`, `COURIER_DELIVER` |
| Compliance & funding | `SUBMIT_VERIFICATION_DOCS`, `DECIDE_VERIFICATION`, `COMPLETE_COURSE`, `REGISTER_TRAINING`, `MARK_ATTENDANCE`, `POST_FUNDING`, `SET_FUNDING_INTEREST`, `SAVE_FUNDING_PROFILE`, … |
| **Demo only** | `SIMULATE_JOIN`, `SIMULATE_FILL`, `SIMULATE_PAY`, `SIMULATE_DEADLINE`, `RESET_DEMO` |

You can call any of them from a terminal while `npm run dev` is running:

```bash
# whole state
curl -s http://localhost:3000/api/state | head -c 400

# reset the demo
curl -s -X POST http://localhost:3000/api/action -H 'content-type: application/json' -d '{"type":"RESET_DEMO"}' > /dev/null

# sign in (returns meta.userId, meta.role)
curl -s -X POST http://localhost:3000/api/action -H 'content-type: application/json' \
  -d '{"type":"SIGN_IN","phone":"071 234 5678","pin":"1234"}' | grep -o '"meta":{[^}]*}'
```

---

## 13. Registration requires the compliance quiz

**A shop cannot be registered without passing the quiz.** The rule is enforced on the server, so it can't be skipped from the browser.

`/owner/register` has four steps:
1. Shop details
2. Location (map pin)
3. Owner phone and PIN
4. The compliance quiz, with short lessons. Wrong answers are marked and you can retry.

Passing the quiz verifies the shop, issues a certificate and signs the owner in.

```ts
case "REGISTER_SHOP": {
  if (!/^\d{4}$/.test(action.pin || "")) return fail(db, "Choose a 4-digit PIN.");
  const phone = action.shop.phone.replace(/\D/g, "");
  if (db.users.some((u) => u.phone.replace(/\D/g, "") === phone))
    return fail(db, "Someone already signs in with that phone number. Sign in instead, or use another number.");

  // No quiz, no shop: every new shop must pass the compliance quiz to register.
  const course = db.courses.find((c) => c.id === action.quiz?.courseId);
  if (!course || !action.quiz) return fail(db, "Pass the compliance quiz to register your shop.");
  const correct = course.quiz.filter((q) => action.quiz!.answers[q.id] === q.correctIndex).length;
  const score = correct / course.quiz.length;
  if (score < course.passMark) return fail(db, `Quiz score ${Math.round(score * 100)}% — you need ${Math.round(course.passMark * 100)}% to register.`);

  const now = new Date().toISOString();
  const shop = { ...action.shop, verified: true, verificationStatus: "verified" as const, verificationMethod: "course" as const, verifiedAt: now };
  const user = { id: `user-${shop.id}`, role: "owner" as const, name: shop.ownerName, phone: shop.phone, pin: action.pin, shopId: shop.id };
  const certificate = { id: uid("cert"), shopId: shop.id, courseId: course.id, score, certificateNumber: `MC-CC-${Math.floor(100000 + Math.random() * 899999)}`, issuedAt: now /* … */ };
  return {
    db: { ...db, shops: [...db.shops, shop], users: [...db.users, user], certificates: [certificate, ...db.certificates] },
    meta: { userId: user.id, role: "owner", shopId: shop.id, certificateId: certificate.id, score },
  };
}
```

The quiz questions and pass mark live on the course in `lib/seed.ts` (`Course.quiz`, `Course.passMark`). The UI is `components/RegistrationQuiz.tsx`.

---

## 14. Showing the discount clearly

When an owner opens a deal, the first card (`components/deal/DealPriceHero.tsx`) shows:

- a **% off** badge;
- **Buying alone ~~R350~~ → Your price when it fills R295 / case** (large, in green);
- **"You save R55 on every case · R220 on your 4"**;
- a **price ladder**, one bar per step, from Alone down to Full, with the current step outlined;
- a progress bar and the line **"3 more to drop to R305 · 9 to the lowest price"**.

Deal cards (`PoolCard.tsx`) show ~~retail~~ → final price with a −% badge. The reserve window (`JoinDealModal.tsx`) shows "You save … vs buying alone" next to "Pay today R0".

The core of the calculation:

```tsx
export default function DealPriceHero({ pool, myQty }: { pool: Pool; myQty?: number }) {
  const unit = pool.unitLabel.split(" (")[0];             // "case (12 × 750ml)" → "case"
  const retail = toCents(pool.retailPrice);                // buying alone
  const final = unitCentsFor(pool, pool.minQty);           // what everyone pays once it fills
  const saveEach = Math.max(0, retail - final);
  const pct = retail > 0 ? Math.round((saveEach / retail) * 100) : 0;
  const qty = totalQtyOf(pool);
  const tiers = [...pool.tiers].sort((a, b) => a.minQty - b.minQty);
  const nextTier = tiers.find((t) => t.minQty > qty);
  const left = Math.max(0, pool.minQty - qty);
  // … render the badge, the struck-through retail price, the green final price,
  //   "You save {saveEach} on every {unit} · {saveEach * myQty} on your {myQty}", and the ladder
}
```

Use it on a page:

```tsx
<DealPriceHero pool={pool} myQty={mine?.qty} />
```


### Product pictures and honest shop psychology

Every item has a drawn pack shot (`components/ProductImage.tsx`). It picks the art from the product name (maize meal, oil, sugar, rice, flour, bread, airtime, candles, soap, kota, chips, veg, meat, or a generic box) and shows the size and a "×12" stack for multipacks. Real product photos live in `public/products/` and are matched by product kind and pack size in `lib/productPhotos.ts` (e.g. any "Maize meal 5kg" item gets `maize-5kg.jpg`). To add one, drop a square JPEG there and add a line to `PHOTOS`. The offline prototype inlines them automatically. An uploaded photo always wins. Pass `src` to use a specific photo:

```tsx
<ProductImage name="Cooking oil 750ml" count={12} size={76} />
<ProductImage name="White bread (700g)" size="fill" />            // fills its box
<ProductImage name="Sugar (2kg)" src="/photos/sugar-2kg.jpg" />  // real photo
```

The deal page and cards use the signals online stores use. Each one is computed from real data, never invented:

| Signal | Where | Comes from |
|---|---|---|
| Price anchoring | Price hero, cards, reserve window | ~~Retail~~ next to the group price, % off |
| Resale profit ("About R92 profit on every case") | `DealShowcase` | Average shelf price verified shops charge (`resaleProfit()` in `lib/products.ts`) |
| Social proof (who's in, last reserved) | `DealSocialProof` | The deal's commitments, shown by township only |
| Scarcity ("Going fast · 7 cases left") | `DealSocialProof`, cards | Units left; highlighted at 35% or less |
| Deadline (live countdown) | `DealSocialProof` | The deal's real `closesAt` |
| Badges: Almost full · Closing soon · New | Cards, picture | `dealBadges()`: ≥70% full, <48 h left, <2 days old |
| Default quantity ("Most shops take 6") | Reserve window | Median units in the deal (`popularQty()`) |
| Trust row | `DealShowcase`, reserve window | Free to reserve · TradeSafe · delivered · verified shops |
| Sticky price + Reserve bar | Deal page on phones | — |
| "Popular here", "R1.50 below the area average" | Customer shop page | The shop's sales and other verified shops' prices |
| Live pop-up ("A shop in Soshanguve just reserved 6 cases") | Every owner page | Reservations that happen while you're in the app (`SalesPop`) |
| Momentum ("26 cases reserved in the last 24 h · viewed by 8 shops today") | `DealSocialProof` | Commitments and real `VIEW_DEAL` visits (`momentum()`) |
| Cross-sell ("Shops in this deal also reserved…") | Deal page | Other open deals sharing shops (`alsoReserved()`) |
| Star ratings and quotes | Deal page, cards | `RATE_DEAL` — only shops whose stock arrived, once per deal |
| "Kasi shops have saved R… buying together" | Buy page, landing | Paid deals: (alone − group price) × units (`platformSavingsCents()`) |
| Product photos | Stock, publish-a-deal, admin deal page | Owners and admins take or upload a photo (`PhotoPicker`, compressed to ~640px JPEG) |

---

## 15. Adding a new feature (worked example)

Say you want owners to **leave a review for a wholesaler** after delivery. Every feature follows the same four steps.

**1. Add the type** (`lib/types.ts`), and add `reviews: Review[]` to `SharedDB` in `lib/server/db.ts` and to `SharedState` in `lib/store.tsx`:

```ts
export interface Review {
  id: string;
  dealId: string;
  shopId: string;
  wholesalerId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
}
```

Bump `DB_VERSION` (7 → 8) and add `reviews: []` to the seed, so old databases are replaced.

**2. Add the action** (`lib/server/actions.ts`):

```ts
  | { type: "LEAVE_REVIEW"; dealId: string; shopId: string; stars: number; text: string }
```

**3. Add the rule** (`lib/server/reducer.ts`). This is the only place that validates and writes:

```ts
case "LEAVE_REVIEW": {
  const pool = db.pools.find((p) => p.id === action.dealId);
  if (!pool) return fail(db, "Deal not found");
  if (pool.status !== "delivered") return fail(db, "You can review once your stock is delivered.");
  if (!pool.commitments.some((c) => c.shopId === action.shopId)) return fail(db, "Only shops in this deal can review it.");
  if (db.reviews.some((r) => r.dealId === pool.id && r.shopId === action.shopId)) return fail(db, "You've already reviewed this deal.");
  const stars = Math.round(action.stars);
  if (stars < 1 || stars > 5) return fail(db, "Choose 1 to 5 stars.");
  const review: Review = {
    id: uid("rev"), dealId: pool.id, shopId: action.shopId, wholesalerId: pool.wholesalerId,
    stars: stars as Review["stars"], text: action.text.trim().slice(0, 500), createdAt: new Date().toISOString(),
  };
  return { db: { ...db, reviews: [review, ...db.reviews] }, meta: { reviewId: review.id } };
}
```

**4. Call it from the UI:**

```tsx
const { dispatch } = useStore();
const res = await dispatch({ type: "LEAVE_REVIEW", dealId: pool.id, shopId: shop.id, stars, text });
if (res.error) setError(res.error);
```

**5. Test it** (`scripts/test-flow.ts`), then run `npm test`:

```ts
r = reduce(db, { type: "LEAVE_REVIEW", dealId: openDeal.id, shopId: "shop-1", stars: 5, text: "Great" });
check("can't review before delivery", !!r.meta.error);
```

---

## 16. Design system

| Token | Value | Use |
|---|---|---|
| Paper (page) | `#F6F2EC` | Page background |
| `sand-50…300` | `#FBF7F1` → `#DCCBAE` | Panels, hover states |
| `ink` | `#171310` | Text, dark surfaces (`ink/60` for secondary text) |
| `ember` | `#E85D2B` (dark `#C4471C`) | Primary action, progress, the current price step |
| `leaf` | `#2F6D4F` | Savings, success, the final price |
| TradeSafe green | `#0B3D3A` | Escrow / checkout surfaces |
| Display font | Bricolage Grotesque 500–800 | Headings and big numbers |
| Body font | Inter 400–700 | Everything else |

Both fonts load from Google Fonts in `app/layout.tsx`.

Component classes in `app/globals.css`:

| Class | What it is |
|---|---|
| `.card` | White rounded panel with a soft border |
| `.btn-ember`, `.btn-dark`, `.btn-outline`, `.btn-pill` | Buttons: orange main action, dark, outlined, and the shared pill base |
| `.chip`, `.chip-active` | Pill filters |
| `.input`, `.label` | Form fields |
| `.eyebrow` | Small uppercase label above a heading |
| `.num` | Tabular numbers, so amounts line up |
| `.glass-dark` | Dark translucent panel (owner home strip) |
| `.kasi-stripe` | Decorative township stripe |
| `.si-flow`, `.si-road` | Sign-in scene animations (switched off under `prefers-reduced-motion`) |

Layouts are checked from **375 px (phone) to 1320 px (desktop)** with no sideways scrolling.

The `.claude/skills/ui-ux-pro-max` folder holds a UI/UX design skill used while building the interface. The app doesn't need it to run.

---

## 17. Tests

```bash
npm test
# …
# PASS every deal passes the ledger proof
# 139 passed, 0 failed
```

`scripts/test-flow.ts` imports the reducer directly and plays a whole season of deals, so no server or browser is needed. The checks cover:

- **Seed:** every deal passes `auditPot`; `reconcile` is balanced; PINs never reach `publicState`.
- **Sign-in and registration:** wrong PIN refused; duplicate phone refused; **registering without the quiz refused**; failing score refused; passing verifies the shop and issues a certificate.
- **Reserving:** unverified shops refused; can't reserve more than what's left; **no money moves on reserve**.
- **Filling:** price locks at the lowest step; the 48-hour window opens; later shops go to the waitlist.
- **Paying:** can't pay before the deal is full; can't pay twice; the payment and the pot share one `TS-…` ref.
- **Payment window:** release refused while time is left; unpaid shops dropped; waitlist promoted; deal reopens if short.
- **Admin:** confirm refused while anyone owes; step order; two-admin rule (can't approve your own request); wholesaler paid units × final price.
- **Delivery:** overloaded vehicles refused; delivery codes; drop points (2 km, capacity, codes); R5/unit and R30 fees paid through TradeSafe; drivers paid per stop.
- **Shop-to-shop transport:** accepted offer required; only participants can book; Sunday and distance limits; split fees; driver assignment after payment; collect-before-deliver order; four-digit hand-over codes; cancellation refunds; driver payout.
- **Cancel:** with R0 paid it closes without a second admin; otherwise refunds are exact and the pot ends at R0.
- **End:** every pot is R0 and every rand collected is accounted for.

---

## 18. What's real and what's simulated

**Real (enforced by the server and tested):**
- all money maths: shares, locked price, escrow balance, payouts, refunds and reconciliation, to the cent;
- every rule and the order of steps;
- the 48-hour window, release and waitlist;
- the two-admin rule;
- registration only after passing the quiz;
- delivery codes, vehicle limits, drop-point rules and per-stop driver pay;
- shop-to-shop transport eligibility, payment splits, delivery codes, cancellation refunds and driver pay;
- messages and inboxes;
- sign-in for every role;
- data that survives restarts.

**Simulated:**
- **TradeSafe.** `TradeSafeCheckout.tsx` imitates the checkout (EFT, card, cash at a till), and no real money moves. In production each deal would be a TradeSafe transaction created through their API, with webhooks confirming each payment.
- **Other shops** joining or paying: the "Demo:" buttons (`SIMULATE_*`). **"Demo: 48 hours pass"** moves the deadline.
- **Distances:** straight line × 1.35 at 35 km/h, not real road routing.
- **Messages** stay in the in-app inbox; there is no SMS or WhatsApp.
- **Sign-in security** is demo grade. PINs are stored in plain text on the server (never sent to browsers), and the server trusts which account the browser says is acting.

---

## 19. The single-file offline prototype

```bash
npm run build:prototype
# → prototype/dist/mzansiconnect-prototype.html  (~1 MB)
```

This bundles every page and **the server reducer itself** into one HTML file. Open it in any browser with no install and no server. State is saved to the browser's `localStorage`. It's useful for judges and for sharing a link.

How it works:
- `prototype/entry.tsx` runs `reduce()` in the browser instead of calling `/api/action`, and routes pages with a small in-memory router.
- `prototype/shims/` replaces `next/link`, `next/navigation`, `next/dynamic`, `fs` and `path` with browser versions.
- `prototype/build.mjs` runs **esbuild** for the JavaScript, then **Tailwind** for the CSS, and inlines both into one file.
- `window.__nav("/owner/pools")` is exposed for scripted testing.

If you change the database shape, also bump the `localStorage` key in `prototype/entry.tsx` so old browser data is ignored.

---

## 20. Deploying

### Render (free, recommended for a live demo)

`render.yaml` is included:

```yaml
services:
  - type: web
    name: mzansiconnect
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start -- -p $PORT
    envVars:
      - key: NODE_VERSION
        value: "20"
      - key: ANTHROPIC_API_KEY
        sync: false # optional
```

1. Push the repo to GitHub.
2. On render.com choose **New → Blueprint**, pick the repo, then **Apply**.

Good to know:
- The free plan sleeps after about 15 minutes idle, so open the link a few minutes before presenting.
- The disk isn't permanent, so the demo data resets on restart. That's fine for a demo.

### Pushing to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/mzansiconnect.git
git push -u origin main
```

### Vercel

Pages render, but Vercel has **no writable disk**, so actions won't persist between requests. Use Render, your own laptop (`npm run dev`), or the offline prototype instead.

### Your own server

```bash
npm ci
npm run build
PORT=8080 npm start
```

Make sure the process can write to `./data/`.

---

## 21. Troubleshooting

| Problem | Fix |
|---|---|
| `Error: Cannot find module …` after pulling | `rm -rf node_modules package-lock.json && npm install` |
| Strange errors or stale pages after big changes | Stop the server, `rm -rf .next`, then `npm run dev` |
| Old data or "Seed not registered" | Delete `data/` (or press **Reset the demo**). Bump `DB_VERSION` if you changed the shape |
| Port 3000 in use | `npx next dev -p 3001` |
| `react-leaflet` peer-dependency error | You installed v5: `npm install react-leaflet@4` |
| Map shows grey tiles | The map tiles need internet; everything else works offline |
| `npm test` says `tsx: not found` | `npm install` (it's a devDependency), or run `npx tsx scripts/test-flow.ts` |
| Changes on Vercel don't stick | Expected: no writable disk. See [Deploying](#20-deploying) |
| Windows: `rm -rf` not recognised | PowerShell: `Remove-Item -Recurse -Force .next` |

---

## 22. Roadmap to production

1. **Real TradeSafe integration:**
   - create a TradeSafe transaction per deal;
   - payment webhooks confirm `PAY_DEAL`;
   - release funds through their API when the order is approved;
   - refunds through their API.
2. **Real sign-in:** hashed PINs, SMS one-time codes, server-side sessions, and every action checked against the signed-in user.
3. **Database:** PostgreSQL, with every money write wrapped in a transaction.
4. **Automatic payment deadline:** a scheduled job runs `ADMIN_RELEASE_UNPAID` when the 48 hours pass.
5. **Escalation for the two-admin rule:** if no second admin responds within a set time, escalate to a third person.
6. **SMS / WhatsApp** for deal-full, pay-now and delivery-code messages.
7. **Road routing** (OSRM or Google) and live driver location.
8. **Wholesaler portal** for wholesalers to post deals and mark stock ready.
9. **POPIA review**, multiple languages and an installable PWA for low-data phones.
