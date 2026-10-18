# MzansiConnect — What Changed and How to Open It

**Date:** 18 October 2026
**Covers:** product pictures, shop psychology (honest selling signals), real product photos, photo uploads, ratings, and the offline prototype build.
**Status:** all 118 automated checks pass, the production build compiles, and every page was checked on a computer (1320 px) and a phone (375 px) with no errors and no sideways scrolling.

---

## Contents

1. [How to open it](#1-how-to-open-it)
2. [The short version: what's new](#2-the-short-version-whats-new)
3. [Where to see each change (click-by-click)](#3-where-to-see-each-change-click-by-click)
4. [Real product photos](#4-real-product-photos)
5. [Drawn pack pictures (fallback)](#5-drawn-pack-pictures-fallback)
6. [The shop psychology, signal by signal](#6-the-shop-psychology-signal-by-signal)
7. [Ratings](#7-ratings)
8. [Photo uploads](#8-photo-uploads)
9. [Data model changes](#9-data-model-changes)
10. [New server actions](#10-new-server-actions)
11. [New demo data](#11-new-demo-data)
12. [Every file that changed](#12-every-file-that-changed)
13. [Tests](#13-tests)
14. [What we deliberately did NOT add](#14-what-we-deliberately-did-not-add)
15. [How to add more photos](#15-how-to-add-more-photos)
16. [Troubleshooting](#16-troubleshooting)
17. [Demo script add-ons](#17-demo-script-add-ons)

---

## 1. How to open it

There are three ways to open MzansiConnect. Pick one.

### Option A: the online prototype (no install)

Open the **MzansiConnect prototype** link (the same link as before; it's now on version 14). It runs entirely in the browser: the rules, the money maths and the photos are all inside one page. What you do is saved in that browser only.

- To start fresh, sign in as an admin (060 100 0001, PIN 1234) and press **Reset the demo** at the bottom of the Overview page.

### Option B: on your laptop (full app with a server)

You need **Node.js 18.18 or newer**.

```bash
cd mzansiconnect          # the project folder
npm install               # first time, or after pulling changes
npm run dev
```

Open **http://localhost:3000**.

> **Important after these changes:** the data shape changed (the database version went from 7 to 8), so the app replaces the old `data/db.json` automatically the first time it starts. If anything looks odd, stop the server, delete the `data` folder, and run `npm run dev` again.

### Option C: the single offline file

```bash
npm run build:prototype
```

This creates `prototype/dist/mzansiconnect-prototype.html` (about 1.3 MB, with the photos built in). Double-click it to open it in any browser. No internet or server is needed, apart from the fonts, which fall back to system fonts when offline.

### Demo accounts (PIN 1234 for everyone)

| Who | Phone | Use it to show |
|---|---|---|
| Thandi, Thandi's Spaza (owner) | **071 234 5678** | Everything on the owner side |
| Zanele (admin 1) | 060 100 0001 | Photo on a deal, confirming payments |
| Lindiwe (admin 2) | 060 100 0003 | Approving, booking drivers |
| Thabo (driver) | 081 400 1001 | Driver side |

---

## 2. The short version: what's new

| # | Change | What the user sees |
|---|---|---|
| 1 | **Real product photos** | Iwisa, White Star, Best Choice, Snowflake, B-well and Dettol packs on deals, cards, pop-ups and shop shelves |
| 2 | **Drawn pack pictures** | A clean drawing for any product that has no photo yet (rice, bread, airtime, veg, meat…) |
| 3 | **Product showcase** on the deal page | A big picture, "What you get", the resale profit and trust badges |
| 4 | **Resale profit** | "About R92.10 profit on every case", worked out from what verified kasi shops really charge |
| 5 | **Social proof** | "5 shops from Soshanguve & Ga-Rankuwa + 2 more are in · Last reserved just now" |
| 6 | **Momentum** | "26 cases reserved in the last 24 h · viewed by 8 shops today" |
| 7 | **Scarcity and deadline** | "Going fast · 7 cases left" and a ticking "Closes in 3d 23:59:41" |
| 8 | **Recent activity** | "A shop in Soshanguve reserved 6 cases · just now" |
| 9 | **Live pop-ups** | "A shop in Ga-Rankuwa just reserved 9 cases of Cooking oil · See the deal →" |
| 10 | **Honest badges** | Almost full · Closing soon · New · −16% |
| 11 | **Star ratings and quotes** | "★★★★★ 4.8 · 4 ratings from shops that received Kasi Wholesalers' stock" |
| 12 | **Rate this deal** | After stock arrives: "How was this deal?" with 1–5 stars and an optional comment |
| 13 | **Cross-sell** | "Shops in this deal also reserved: Maize meal 5kg ~~R750~~ R670" |
| 14 | **Default quantity** | "Most shops take 6" chip in the reserve window |
| 15 | **Savings counter** | "Kasi shops have saved R1 980 buying together" (Buy page and landing page) |
| 16 | **Sticky reserve bar (phones)** | ~~R350~~ **R295** + a Reserve button that stays at the bottom while scrolling |
| 17 | **Shop shelf tiles** (customer view) | Photo tiles with a big price, "Popular here" and "R… below the area average" |
| 18 | **Photo uploads** | Owners (My stock) and admins (publish a deal / deal page) can take or upload a photo |

---

## 3. Where to see each change (click-by-click)

### As Thandi (owner) — sign in with 071 234 5678 / 1234

1. **Buy** (left menu or top bar)
   - The green pill under the heading: **"Kasi shops have saved R1 980 buying together"**.
   - The deal cards now show:
     - the **product photo** with a **×12 / ×10** pack badge;
     - a **−16%** badge on the photo;
     - a **★ 4.8** star rating before the wholesaler's name;
     - ~~R350~~ **R295** pricing;
     - an **Almost full** or **New** badge;
     - "5 shops in · **7 left**" (orange when 35% or less is left).
2. **Buy → Cooking oil 750ml** (the main demo deal)
   - **Top card (showcase):**
     - the B-well bottle photo with the **Almost full** badge and **×12**;
     - stars with 4.8, then 4 ratings;
     - "What you get" (4 ticked facts);
     - the green **profit box**;
     - two shop quotes;
     - the trust row (Free to reserve · Money held by TradeSafe · Delivered to your shop · Verified shops only).
   - **Price card:** 16% off, ~~R350~~ → R295, and the price ladder (from the earlier update).
   - **Join card:**
     - shop circles and "N shops from … are in";
     - the momentum line;
     - **Going fast** and the **Closes in** countdown;
     - **Recent activity**;
     - on the right, **Reserve more** and **Demo: shop joins**.
   - **"Shops in this deal also reserved"** shows Maize meal 5kg.
   - Press **Demo: shop joins**. Watch:
     - the pop-up in the bottom-left;
     - the units-left count going down;
     - the new line at the top of Recent activity;
     - the ladder stepping down.
   - Press **Reserve more** to see the reserve window: the product photo at the top, ~~R350 alone~~ / R295 each together, the **Most shops take N** chip, and "Pay today R0".
3. **Buy → Bar soap 175g** (a finished deal from last week)
   - It shows the Dettol photo, the rating and quotes.
   - Further down: **"You rated this deal 5 stars"**. This proves the rating flow went end to end.
4. **Buy → Maize meal 10kg** (finished, White Star photo): Thandi rated it 5 stars.
5. **My stock**
   - Each item has a **photo or drawing with a camera button**. Tap it to take or choose a photo; on a phone it opens the camera.
   - **Add item** now starts with **Add a photo**.
6. **Find shops → Thandi's Spaza** (the customer view, also at `/consumer/shop/shop-thandi`)
   - The shelf is now a **grid of photo tiles**: Iwisa maize meal, Best Choice sugar, B-well oil (faded, **Sold out**), a white bread drawing, and an airtime drawing.
   - Best sellers carry a **Popular here** badge.
7. **Willing buyer & seller:** every listing has a product photo (B-well oil, mince drawing…).
8. **Landing page (`/`):** the top badge reads "N verified shops trading · R1 980 saved together".

### As Zanele (admin) — 060 100 0001 / 1234

- **Deals → any deal:** a **photo with a camera button** sits next to the deal's name. Tap it to set or replace the product photo for everyone.
- **Deals → Publish a new deal:** a **Product photo** field sits under Product / Unit.

---

## 4. Real product photos

### Which photo goes where

| File (in `public/products/`) | Photo | Shown on |
|---|---|---|
| `maize-5kg.jpg` | Iwisa Super Maize Meal 5 kg | Maize meal 5kg deal; "Maize meal (5kg)" shelf items |
| `maize-10kg.jpg` | White Star Super Maize Meal 10 kg | Maize meal 10kg deal |
| `sugar-2kg.jpg` | Best Choice pure white sugar 2 kg | White sugar 2kg deal; "Sugar (2kg)" shelf items |
| `flour-10kg.jpg` | Snowflake cake wheat flour 10 kg | Cake flour 10kg deal |
| `oil-750ml.jpg` | B-well cooking oil blend 750 ml | Cooking oil 750ml deal; shelf items; exchange posts |
| `soap-175g.jpg` | Dettol Original bath soap 175 g | Bar soap 175g deal; "Bar soap" shelf items |

Each photo was trimmed, centred on a white square, resized to 600 × 600 and saved as a JPEG of about 20–50 KB, so pages stay fast on mobile data.

### How a picture is chosen (`ProductImage`)

For every product name the app shows, in this order:

1. **An uploaded photo** (the owner's or admin's own), if there is one.
2. **A real product photo** of the same kind **and** the same pack size (for example "Maize meal (5kg)" → `maize-5kg.jpg`).
3. **A real photo of the same kind in another size**, if that exact size isn't there.
4. **A drawn pack picture** for anything else.

```ts
// lib/productPhotos.ts
export function stockPhoto(name: string) {
  const kind = productKind(name);                         // "maize", "oil", "sugar", …
  if (kind === "generic") return undefined;
  const size = splitSize(name).size?.toLowerCase();       // "5kg", "750ml", …
  const hit = PHOTOS.find((p) => p.kind === kind && p.size === size) ?? PHOTOS.find((p) => p.kind === kind);
  return hit ? { src: photoUrl(hit.file), alt: hit.alt } : undefined;
}
```

```tsx
// components/ProductImage.tsx
const photo = src ? { src, alt: "" } : stockPhoto(name);   // uploaded → real photo → drawing
```

### How photos work offline

`lib/photoUrl.ts` normally returns `/products/<file>`. When the single-file prototype is built, `prototype/build.mjs` swaps that module for one that holds every photo as built-in image data, so the one HTML file still shows the photos with no server.

---

## 5. Drawn pack pictures (fallback)

`components/ProductImage.tsx` draws a clean pack for 19 kinds of product, using the product name and size on the label:

| Kind | Picture | Kind | Picture |
|---|---|---|---|
| maize meal | sack with a corn cue | kota | quarter-loaf with fillings |
| cooking oil | bottle | chips & russian | fries carton |
| sugar | sack with sugar cubes | bunny chow | bread bowl |
| rice | sack with grains | tomatoes | three tomatoes |
| flour | sack with wheat | onions | three onions |
| bread | loaf | spinach | leaf bunch |
| airtime | voucher card with signal waves + amount | boerewors | coil |
| candles | three lit candles | chicken | labelled bag |
| soap | bar with bubbles | mince | tray |
| anything else | a plain labelled box | | |

Multipacks (for example "case (12 × 750ml)") show a **stack** and a **×12** badge. There are no brand logos in the drawings.

---

## 6. The shop psychology, signal by signal

**Rule we kept:** every number and badge comes from real data in the app. Nothing is invented, so nothing can be caught out by a judge.

| Signal | Psychology | Where | Comes from (code) |
|---|---|---|---|
| ~~R350~~ → **R295**, −16% | Price anchoring | Price card, deal cards, reserve window, sticky bar | `retailPrice` vs `unitCentsFor(pool, pool.minQty)` |
| "About R92.10 profit on every case" | Gain framing (shows the owner's upside in rands) | Showcase | `resaleProfit()` = items × average kasi shelf price − (price + 2% fee + delivery share) |
| Shop circles + "N shops … are in" | Social proof | Join card | `pool.commitments` (township only; names stay private) |
| "Last reserved just now" | Recency | Join card | newest `joinedAt` |
| "26 cases reserved in the last 24 h · viewed by 8 shops today" | Momentum / bandwagon | Join card | `momentum()`: commitments and `pool.views` in the last 24 h |
| "Going fast · 7 cases left" | Scarcity | Join card, cards | units left; orange at 35% or less |
| "Closes in 3d 23:59:41" | Urgency | Join card | the deal's real `closesAt`, ticking every second |
| Recent activity list | Social proof | Join card | the 4 newest commitments |
| Live pop-up "…just reserved…" | Social proof in real time | Every owner page | `SalesPop`: only reservations that happen while you're using the app |
| Almost full · Closing soon · New | Scarcity / novelty | Cards, showcase photo | `dealBadges()`: ≥70% full · <48 h left · <2 days old |
| ★ 4.8 + quotes | Social proof / trust | Showcase, cards | `wholesalerRating()` from `RATE_DEAL` |
| "Shops in this deal also reserved…" | Cross-sell ("frequently bought together") | Deal page | `alsoReserved()`: open deals sharing the most shops |
| "Most shops take 6" | Default effect | Reserve window | `popularQty()`: median units (shown with 3+ shops) |
| Trust row | Risk reduction | Showcase, reserve window | fixed facts: free to reserve, TradeSafe escrow, delivery, verified only |
| "Kasi shops have saved R1 980" | Social proof at scale | Buy page, landing | `platformSavingsCents()`: (alone − group price) × units on paid deals |
| Sticky price + Reserve bar | Fewer steps to act | Deal page, phones only | — |
| "Popular here", "R… below the area average" | Social proof / value | Customer shop shelf | the shop's own sales; other verified shops' prices (shown only for R1+ savings) |

### The maths behind the profit box

```ts
// lib/products.ts
landedUnitCents = unitPrice × (1 + 2% fee) + deliveryFee / lotSize
revenueCents    = itemsPerCase × averageShelfPrice   // from verified shops' stock lists
profitCents     = revenueCents − landedUnitCents     // hidden if ≤ 0
```

Example (Cooking oil): 12 bottles × R34 = R408 revenue. Cost: R295 × 1.02 + R450 / 30 = R315.90. **Profit about R92.10 a case (23%).**

The shelf price only counts products of the **same kind and pack size** ("White sugar 2kg" ↔ "Sugar (2kg)"), so rice 10 kg is never compared with rice 2 kg.

---

## 7. Ratings

### The rules (enforced on the server)

- Only a **shop that was in the deal** can rate it.
- Only **after its own stock arrived**: the deal is Delivered, or that shop's stop is marked delivered.
- **One rating per shop per deal.**
- **1–5 stars**, with an optional comment of up to 200 characters.

### Where ratings show

- **Deal showcase:** stars, the average and the count (for example "4.8 · 4 ratings from shops that received Kasi Wholesalers' stock"), plus the two newest comments, signed only "A shop in Ga-Rankuwa · Bar soap 175g".
- **Deal cards:** a small ★ 4.8 before the wholesaler's name.
- A wholesaler with no ratings shows **"New partner wholesaler · no ratings yet"**.
- A rating counts for **the wholesaler**, so it shows on all of that wholesaler's deals.

### The rating card

After delivery, the owner's deal page shows **"How was this deal?"** with five big stars (Poor → Excellent), an optional comment and **Post my rating**. Afterwards it shows "You rated this deal 5 stars".

---

## 8. Photo uploads

| Who | Where | What happens |
|---|---|---|
| Owner | **My stock** → tap an item's picture | Choose or take a photo; it replaces the drawing on the shelf and in My stock |
| Owner | **My stock → Add item** → "Add a photo" | The new item starts with its photo |
| Admin | **Publish a new deal** → "Product photo" | The deal is published with that photo |
| Admin | **Deal control room** → tap the picture by the title | Sets or replaces the deal's photo for everyone |

- On phones the picker opens the **camera** (`capture="environment"`).
- `lib/photo.ts` **shrinks** every photo in the browser to at most 640 px on its longest side as a JPEG (~40–80 KB) before saving. The server refuses deal photos over ~400 KB.
- An uploaded photo **always wins** over the built-in photo and the drawing.
- Photos are stored with the product (as image data in `data/db.json`), so they survive restarts.

---

## 9. Data model changes

`lib/types.ts`

```ts
interface Good {
  // …existing fields
  photo?: string;                     // owner's own photo (compressed image data)
}

interface Pool {
  // …existing fields
  ratings: DealRating[];              // shops rate once their stock has arrived
  views: Record<string, string>;      // shopId → last time that shop opened the deal
  photo?: string;                     // product photo from the admin/wholesaler
}

interface DealRating {
  shopId: string;
  township: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  at: string;                         // ISO date
}
```

`lib/server/db.ts`: `DB_VERSION` is now **8** (it was 7). An older `data/db.json` is replaced with fresh demo data on start-up.

`prototype/entry.tsx`: the browser storage key is now **`mzansiconnect-demo-db-v10`**, so old prototype data is ignored.

---

## 10. New server actions

| Action | Who | Rules |
|---|---|---|
| `RATE_DEAL { dealId, shopId, stars, comment? }` | Owner | In the deal · stock arrived · not rated yet · 1–5 stars · comment ≤ 200 chars |
| `VIEW_DEAL { dealId, shopId }` | Owner (sent automatically when a deal page opens) | Records "this shop looked at this deal now" |
| `ADMIN_SET_DEAL_PHOTO { dealId, photo }` | Admin | `photo: null` removes it · too-big photos are refused |
| `ADMIN_CREATE_DEAL { …, photo? }` | Admin | Now accepts an optional photo |
| `UPDATE_GOOD { patch: { photo } }` / `ADD_GOOD { good: { photo } }` | Owner | Existing actions; they now carry a photo |

`JOIN_DEAL` now also records a **view**, because reserving means you looked at the deal.

Try them from a terminal while `npm run dev` is running:

```bash
curl -s -X POST http://localhost:3000/api/action -H 'content-type: application/json' \
  -d '{"type":"RATE_DEAL","dealId":"<id>","shopId":"shop-thandi","stars":5}'
```

---

## 11. New demo data

Two **finished deals from last week** were added so that every partner wholesaler has real ratings. They are built by replaying real actions (reserve → pay → confirm → approve → book → deliver → rate), the same way as all the other demo data, so the money balances to the cent.

| Deal | Wholesaler | Shops | Ratings |
|---|---|---|---|
| **Bar soap 175g** (case of 24) — R216 alone → R189 together | Kasi Wholesalers | Kgomotso 6, Thandi 4, Bongani 5, Mama Joy 5 | 5 ★ "Driver came on time and every case was sealed." · 5 ★ "R27 cheaper a case than my usual cash & carry." · 4 ★ "Good price. Came in the afternoon instead of morning." · 5 ★ |
| **Maize meal 10kg** — R155 → R136 | Highveld Milling | Thandi 6, Sipho 5, Ayanda 4, Butchery 5 | 5 ★ "Saved me a trip to town. Bags were clean and dry." · 4 ★ "Collected at the wholesaler — quick and easy." · 5 ★ |
| Cake flour 10kg (already existed) | Mzansi Grain Traders | — | 5 ★ "Fresh stock, long expiry dates." · 4 ★ "Left at Thandi's next door — easy to collect." |

Resulting wholesaler ratings: **Kasi Wholesalers 4.8**, **Highveld Milling 4.7**, **Mzansi Grain Traders 4.5**.

**Views:** Sipho, Kgomotso, Mama Joy and the butchery have "looked at" Cooking oil, and Thandi, Bongani, Ayanda and Tebogo have "looked at" Maize meal 5kg. That's why "viewed by 8 shops today" appears.

> The finished deals were replayed today, so their messages show today's time even though their delivery dates are last week. This is a demo-data quirk only.

---

## 12. Every file that changed

### New files

| File | What it does |
|---|---|
| `lib/products.ts` | Product kinds and sizes, pack facts, kasi shelf price, resale profit, `ago()`, `popularQty()`, `dealBadges()`, `wholesalerRating()`, `momentum()`, `alsoReserved()`, `platformSavingsCents()` |
| `lib/productPhotos.ts` | The list of real photos and `stockPhoto(name)` |
| `lib/photoUrl.ts` | Where photos are served from (swapped in the offline build) |
| `lib/photo.ts` | `compressPhoto()`: shrinks a camera photo in the browser |
| `components/ProductImage.tsx` | Uploaded photo → real photo → drawn pack |
| `components/deal/DealShowcase.tsx` | Picture, "What you get", profit box, ratings, quotes, trust row |
| `components/deal/DealSocialProof.tsx` | Shop circles, momentum, scarcity, countdown, recent activity |
| `components/shop/Stars.tsx` | Read-only stars (supports partial stars, e.g. 4.8) |
| `components/shop/RateDealCard.tsx` | "How was this deal?" rating card |
| `components/shop/AlsoReserved.tsx` | "Shops in this deal also reserved…" |
| `components/shop/SalesPop.tsx` | Live "just reserved" pop-up |
| `components/shop/PhotoPicker.tsx` | Take or choose a photo (camera on phones) |
| `public/products/*.jpg` | The 6 product photos |

### Changed files

| File | Change |
|---|---|
| `app/owner/pools/[id]/page.tsx` | New layout: showcase → price → join card (social proof + actions) → also reserved → rate card → payment → tracker…; records a view; sticky phone bar |
| `app/owner/pools/page.tsx` | Savings counter under the heading |
| `app/page.tsx` | "R… saved together" in the landing badge |
| `app/consumer/shop/[id]/page.tsx` | Shelf as photo tiles; Popular here; below area average |
| `app/owner/stock/page.tsx` | Photo on every item; photo when adding an item |
| `app/owner/exchange/page.tsx` | Photo on every listing |
| `app/admin/deals/new/page.tsx` | Product photo field |
| `app/admin/deals/[id]/page.tsx` | Photo button by the deal title |
| `components/pot/PoolCard.tsx` | Photo, −% on the photo, ★ rating, honest badges, "N shops in · N left" |
| `components/deal/JoinDealModal.tsx` | Photo in the header, "Most shops take N" |
| `components/AppShell.tsx` | Shows `SalesPop` for owners |
| `lib/types.ts` | `Good.photo`, `Pool.ratings`, `Pool.views`, `Pool.photo`, `DealRating` |
| `lib/server/actions.ts` | `RATE_DEAL`, `VIEW_DEAL`, `ADMIN_SET_DEAL_PHOTO`, photo on `ADMIN_CREATE_DEAL` |
| `lib/server/reducer.ts` | Rules for the new actions; joining records a view |
| `lib/server/db.ts` | `DB_VERSION` 8 |
| `lib/seed.ts` | Bar soap and Maize meal 10kg deal templates |
| `lib/server/seedDb.ts` | Finished, rated past deals; flour ratings; views |
| `scripts/test-flow.ts` | 8 new checks (118 total) |
| `prototype/build.mjs` | Puts the photos inside the offline file |
| `prototype/entry.tsx` | Storage key v10 |
| `README.md` | New section: "Product pictures and honest shop psychology" |

---

## 13. Tests

```bash
npm test
# …
# — Ratings and views (real social proof) —
# PASS seeded ratings come only from shops in delivered deals
# PASS a shop outside the deal can't rate it
# PASS can't rate before your stock arrives
# PASS stars must be 1 to 5
# PASS a shop in a delivered deal can rate it
# PASS only one rating per shop per deal
# PASS opening a deal records a real view
# PASS reserving counts as viewing
# …
# 118 passed, 0 failed
```

The two new past deals also go through the existing money checks: every deal passes the ledger proof, every pot ends at R0, and "every rand accounted for" stays **Balanced**.

Also checked by hand in a browser:
- the full payment journey on the offline file (pay → reserve → fee → release to waitlist → confirm → Balanced);
- the deal, Buy, stock, exchange, shop shelf and landing pages at 1320 px and 375 px, with no page errors and no sideways scroll;
- the pop-up appearing after **Demo: shop joins**.

---

## 14. What we deliberately did NOT add

| Common trick | Why we left it out |
|---|---|
| "12 people are viewing this right now" with made-up numbers | It would be invented. We show real views from the last 24 h instead. |
| Prices ending in 9 (R299) | Wholesalers set the prices; we don't change them. |
| Spin-the-wheel or first-order rewards | Needs a real budget to fund it. It can be added later as a funded promotion. |
| Fake countdowns that restart | Our countdown is the deal's real closing time. |
| Made-up reviews | Only shops whose stock arrived can rate, once per deal. |

---

## 15. How to add more photos

1. Save a clear photo of the product. A square image on white works best; any size is fine.
2. Put it in `public/products/`, for example `public/products/rice-10kg.jpg`.
3. Add one line to the `PHOTOS` list in `lib/productPhotos.ts`:

```ts
  { kind: "rice", size: "10kg", file: "rice-10kg.jpg", alt: "Tastic long-grain rice 10 kg" },
```

`kind` must be one of: `maize, oil, sugar, rice, flour, bread, airtime, candles, soap, kota, chips, bunny, tomato, onion, spinach, wors, chicken, mince`. `size` is written like it appears in product names: `5kg`, `750ml`, `175g`, `2kg`.

4. Restart `npm run dev`. For the offline file, run `npm run build:prototype` again.

Every deal, card and shelf item of that kind and size picks up the photo automatically.

**Still drawn (no photo yet):** long-grain rice, white bread, airtime, candles, kota, chips & russian, bunny chow, tomatoes, onions, spinach, boerewors, chicken feet, beef mince.

---

## 16. Troubleshooting

| Problem | Fix |
|---|---|
| Errors about `ratings` or `views` being undefined | Old data. Stop the server, delete the `data` folder, then `npm run dev`. Or press **Reset the demo**. |
| Photos don't show on your laptop | Check the files are in `public/products/` with the exact names in `lib/productPhotos.ts` (lower-case, `.jpg`) |
| Photos don't show in the offline file | Run `npm run build:prototype` again after adding photos |
| Prototype shows old data | It uses the new storage key automatically; otherwise use **Reset the demo** |
| No pop-up appears | It only shows for reservations that happen **after** the page opened. Press **Demo: shop joins** on a deal. |
| "Most shops take N" missing | It needs at least 3 shops in the deal |
| Profit box missing | It shows only when verified shops list the same product and size on their shelves, and the profit is above R0 |
| Uploaded photo says too big | Use a smaller photo; phone photos are shrunk automatically, but very large deal photos (>400 KB after shrinking) are refused |
| `npm test` fails after pasting code | Make sure `lib/seed.ts` and `lib/server/seedDb.ts` both have the new deals, and `DB_VERSION` is 8 |

---

## 17. Demo script add-ons

Add these lines to the 3–4 minute demo. Each takes about 10 seconds.

- **On the Cooking oil deal (before reserving):**
  *"Owners see the real product, what's in the case, and how much they'll make reselling it: about R92 a case at the price kasi shops already charge. These stars come only from shops that actually received this wholesaler's stock."*
- **After pressing Demo: shop joins:**
  *"See the pop-up: a shop in Ga-Rankuwa just reserved. The units left drop, the price ladder steps down, and shops can see that others are buying. All of it is real activity, nothing invented."*
- **On the customer shop page (if time):**
  *"Customers see real pictures and prices of what's on the shelf before they walk to the shop."*
