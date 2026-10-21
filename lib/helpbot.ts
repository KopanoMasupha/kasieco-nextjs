/**
 * MzansiConnect helper: answers questions about how the platform works.
 * Rule-based so it works offline and never invents features; when an
 * ANTHROPIC_API_KEY is set, /api/ai/chat hands the same knowledge to Claude
 * for more natural answers.
 */

export interface HelpLink {
  label: string;
  href: string;
}

interface Intent {
  id: string;
  keywords: string[];
  answer: string;
  links?: HelpLink[];
}

export const INTENTS: Intent[] = [
  {
    id: "deal",
    keywords: ["deal", "bulk", "pot", "pool", "group buy", "buy together", "join", "price drop", "cheaper", "how much do i pay", "buy"],
    answer:
      "MzansiConnect partners with wholesalers who put up a bulk lot (for example 60 bales of maize meal). On 'Buy' you add the deals you want to your cart, then check out to reserve them all at once — it's free, you pay R0 today. The more shops reserve, the lower the price. When the whole lot is reserved, the price locks at the lowest tier and everyone pays that same final price within 48 hours, through TradeSafe. Then MzansiConnect orders it for all of you.",
    links: [{ label: "See deals", href: "/owner/pools" }],
  },
  {
    id: "wallet",
    keywords: ["wallet", "top up", "topup", "top-up", "load money", "balance", "withdraw", "eft", "card", "cash", "pay", "payment", "bank", "tradesafe", "escrow"],
    answer:
      "There's no wallet to top up. You only pay when a deal you reserved is full: you get a message, then tap 'Pay with TradeSafe' and pay by Instant EFT, card, or cash at a shop till. TradeSafe — a licensed escrow company — holds the money in trust, not MzansiConnect. It's released to the wholesaler and driver only after the deal is approved and delivered. Everything you owe or paid is on the Payments page.",
    links: [{ label: "Payments", href: "/owner/payments" }],
  },
  {
    id: "refund",
    keywords: ["refund", "money back", "not reached", "target", "minimum", "cancel", "lose my money", "safe"],
    answer:
      "If a deal doesn't fill up, it simply closes — you only reserved, so you never paid anything and there's nothing to refund. You pay only once it's full, at the final lowest price, so there are no price-drop refunds either. If a deal is ever cancelled after you paid, TradeSafe refunds you to the account you paid from (usually 1–3 working days). If you don't pay within 48 hours, your spot goes to the next shop on the waitlist — no money taken.",
  },
  {
    id: "after-close",
    keywords: ["what happens", "closed", "order placed", "confirm", "admin", "when will", "status", "track"],
    answer:
      "Every deal page shows a tracker with 7 steps: Filling up (shops reserve, free) → Payment due (the deal is full: everyone pays into TradeSafe within 48 hours) → Payments checked (MzansiConnect checks every payment) → Ordered (two admins approve paying the wholesaler from escrow) → Scheduled (you get a date, a time slot and a driver) → On the way → Delivered. You get a message at every step — tap the bell at the top.",
    links: [{ label: "My messages", href: "/inbox" }],
  },
  {
    id: "delivery-code",
    keywords: ["code", "delivery code", "pin for delivery", "right person", "stolen", "wrong shop"],
    answer:
      "Every shop in a deal gets its own 4-digit delivery code on the deal page. When the driver arrives, count your stock first, then read the code to the driver. The driver types it in — the delivery only counts when the code matches, so stock can't be handed to the wrong person.",
  },
  {
    id: "delivery",
    keywords: ["delivery", "driver", "transport", "truck", "bakkie", "collect", "late", "time slot", "missed"],
    answer:
      "After the order is placed, MzansiConnect's planner groups shops by township (Mamelodi, Soshanguve, Ga-Rankuwa and so on), picks a vehicle big enough for the load, and gives every shop a 30-minute time slot inside its opening hours. You get a message when the driver collects the stock and when it's handed over. If the driver misses you, MzansiConnect rebooks a new time.",
  },
  {
    id: "delivery-choices",
    keywords: ["not there", "miss", "missed", "away", "choose day", "which day", "morning", "afternoon", "backup", "someone else", "i'll be there", "confirm", "re-delivery", "redelivery"],
    answer:
      "When you join a deal you choose the days you can receive stock (Mon–Sat), morning or afternoon, and what happens if nobody is there: the driver comes back later that day, leaves it at a partner shop you trust nearby, brings it on the next run, or you collect it at the wholesaler. You can name a backup person who gets their own code. When your delivery is scheduled, tap \"I'll be there\". If you confirm and then aren't there, a R30 re-delivery fee is added to your Payments page.",
  },
  {
    id: "drop-point",
    keywords: ["drop point", "partner shop", "neighbour", "keep stock", "hold stock", "earn"],
    answer:
      "A drop point is a verified shop that keeps a neighbour's missed delivery for up to 72 hours. The owner chooses it in advance, the driver leaves the sealed stock there with the drop point's code, and the owner collects it with their own delivery code. The drop point earns R5 per unit. Turn it on under 'Drop point' in the menu.",
    links: [{ label: "Drop point", href: "/owner/partner" }],
  },
  {
    id: "two-admins",
    keywords: ["admin", "approve", "approval", "two-person", "who checks", "fraud", "steal"],
    answer:
      "MzansiConnect has two admins: one for deals and money, one for deliveries and drivers. Money only leaves a deal (paying the wholesaler, or refunds when a deal is cancelled) when one admin asks and a different admin approves. Every approval is recorded with names and times.",
  },
  {
    id: "driver-help",
    keywords: ["accept trip", "my trips", "i am a driver", "load list", "can't deliver"],
    answer:
      "Drivers: open 'My trips', tap 'Accept this trip', then 'I've collected the stock' at the wholesaler. At each shop, count the stock with the owner, ask for their 4-digit code and type it in. If nobody's there, tap 'I can't deliver here' and pick a reason — MzansiConnect will rebook. You're paid automatically when every stop on the trip is delivered.",
    links: [{ label: "My trips", href: "/driver" }],
  },
  {
    id: "proof",
    keywords: ["proof", "trust", "ledger", "see payments", "transparent", "audit", "where is my money"],
    answer:
      "Every deal has a live money list: every payment in and out, with a reference number and the running balance. The 'Ledger proof' panel re-checks the whole pot in your own browser — money in minus money out equals the balance, it never went below R0, and it ends at exactly R0 when the deal is finished.",
    links: [{ label: "Open a deal", href: "/owner/pools" }],
  },
  {
    id: "exchange",
    keywords: ["exchange", "swap", "trade", "short", "extra", "fair", "unfair", "willing", "seller", "sell to"],
    answer:
      "Willing buyer & seller lets verified shops sell or swap stock with each other. Post what you have extra of or are short on, and you'll see matches nearby. When you make an offer, MzansiConnect shows what each side is worth at the average shelf price kasi shops charge, and suggests a cash top-up so it's fair. Nothing happens until both shops accept, and both confirm the hand-over.",
    links: [{ label: "Willing buyer & seller", href: "/owner/exchange" }],
  },
  {
    id: "verify",
    keywords: ["verify", "verified", "compliance", "register", "registration", "documents", "badge", "cipc", "permit", "certificate"],
    answer:
      "You can't register a shop without passing the compliance quiz. It's the last step of registration: read four short lessons (registration, food safety, by-laws), answer the quiz, and score at least 70%. Pass and your shop is registered and Verified straight away, with a certificate. Didn't pass? Your wrong answers are shown — fix them and try again. You can still upload documents (CIPC, Certificate of Acceptability, trading permit) later for a verifier to keep on file.",
    links: [
      { label: "Compliance", href: "/owner/compliance" },
      { label: "Free course", href: "/owner/learn" },
    ],
  },
  {
    id: "funding",
    keywords: ["fund", "funding", "grant", "loan", "money for my business", "nyda", "sefa", "sedfa", "nef", "support", "opportunit"],
    answer:
      "The Funding page lists grants, loans and programmes for township businesses — like the Spaza Shop Support Fund, TREP and the NYDA Grant — with what you get, who qualifies and how to apply. Answer a few questions once and MzansiConnect pre-checks which ones fit you. You can track each one from 'saved' to 'applied'. Always confirm details on the official site, because programmes change.",
    links: [{ label: "Funding & support", href: "/owner/funding" }],
  },
  {
    id: "stock-ai",
    keywords: ["stock", "ai", "insight", "run out", "running low", "overstock", "sales", "record a sale"],
    answer:
      "The stock assistant on 'My stock' reads your stock counts and the sales you log, works out how many days of stock you have left, and flags items about to run out or sitting on the shelf. For extra stock it looks for a nearby verified shop that's short on the same thing, so you can offer it on Willing buyer & seller.",
    links: [{ label: "My stock", href: "/owner/stock" }],
  },
  {
    id: "transport",
    keywords: ["transport", "driver", "bakkie", "car", "move the goods", "collect", "fetch", "delivery between", "courier", "lift"],
    answer:
      "No car? Once both shops accept an offer on Willing buyer & seller, tap 'Book transport' in the chat. Choose which way the goods go (or both ways for a swap), a day and time, and who pays: you, them, or 50/50. The fee is R40 plus R9 a km (×1.6 both ways) and is held by TradeSafe until the goods arrive. The shop receiving the goods reads its 4-digit code to the driver, and then the driver is paid. You can cancel for a full refund until the driver collects.",
    links: [{ label: "Willing buyer & seller", href: "/owner/exchange" }],
  },
  {
    id: "cart",
    keywords: ["my cart", "shopping bag", "checkout", "check out", "add to cart", "basket", "reserve all"],
    answer:
      "On Buy, tap 'Add to cart' on any deal (or open a deal and choose how many). The bag icon at the top shows your cart. At checkout you set delivery days once for everything, then tap 'Reserve all · pay R0 today'. Nothing is paid at checkout: you pay each deal within 48 hours of it filling, and the Due now bar shows the countdown.",
    links: [{ label: "Open my cart", href: "/owner/cart" }],
  },
  {
    id: "customer-buy",
    keywords: ["order online", "buy online", "deliver to me", "customer pay", "customer order"],
    answer:
      "Customers can't order or pay online yet. Right now you can find verified shops near you, see what they have on the shelf and their prices, check if they're open, and call, WhatsApp or get directions. Online ordering is on our roadmap for a later phase.",
    links: [{ label: "Find shops", href: "/consumer" }],
  },
  {
    id: "find",
    keywords: ["find", "near me", "map", "which shop", "where can i", "open now", "hours"],
    answer:
      "Open the map, search for what you need (like 'bread' or 'airtime'), or pick a township. Only verified shops that have it in stock show up, nearest first. Each shop page shows opening hours, whether it's open now, prices and stock levels.",
    links: [{ label: "Open the map", href: "/consumer" }],
  },
  {
    id: "fees",
    keywords: ["fee", "cost", "charge", "commission", "free", "how do you make money"],
    answer:
      "Joining MzansiConnect is free. On deals there's a 2% service fee on the goods value, shown before you pay. The delivery cost is split between shops by how many units each one bought. Reserving is free; you pay through TradeSafe only when the deal fills.",
  },
  {
    id: "training",
    keywords: ["training", "seta", "workshop", "class", "learn"],
    answer:
      "Under Compliance → Government training you can register for free in-person sessions run by the Wholesale & Retail SETA with SEDFA — registration, food safety, inventory and bookkeeping.",
    links: [{ label: "Training sessions", href: "/owner/training" }],
  },
];

/** Things people ask about that we don't do yet — answered honestly. */
const ROADMAP: { keywords: string[]; answer: string }[] = [
  { keywords: ["review", "rating", "stars"], answer: "Customer reviews and ratings aren't on MzansiConnect yet — they're planned for a later phase, once enough shops and customers are trading on the platform." },
  { keywords: ["zulu", "sotho", "xhosa", "tswana", "language", "afrikaans"], answer: "MzansiConnect is English-only for now. isiZulu, Sesotho, isiXhosa and other languages are on the roadmap." },
  { keywords: ["loan from kasieco", "credit", "lend"], answer: "MzansiConnect doesn't lend money itself. The Funding page points you to grants and loans from government and partners." },
  { keywords: ["app store", "android app", "download app", "ios"], answer: "There's no app-store app yet — MzansiConnect runs in your phone's browser. A downloadable app is planned." },
  { keywords: ["makro", "supplier list", "add supplier", "my own deal", "start a deal"], answer: "Deals come only from wholesalers MzansiConnect has partnered with, so prices and stock are checked. Shops can't start their own deals — but you can tell MzansiConnect what you'd like to see by sending a message from the bell at the top." },
];

const FALLBACK =
  "We don't have that on MzansiConnect yet, but I've noted it as something to look at in future. I can help with payments, joining deals, deliveries and codes, Willing buyer & seller, getting verified, funding, your stock, or finding shops near you.";

export const SUGGESTIONS = [
  "How do I pay?",
  "How does a deal work?",
  "What is the delivery code?",
  "What if the deal doesn't fill up?",
  "How do I get verified?",
  "What funding can I get?",
  "Can customers order online?",
];

function score(text: string, keywords: string[]) {
  return keywords.reduce((n, k) => (text.includes(k) ? n + k.length : n), 0);
}

export function answerQuestion(question: string): { text: string; links?: HelpLink[] } {
  const q = question.toLowerCase();
  if (/^\s*(hi|hello|hey|sawubona|dumela|molo|howzit)\b/.test(q)) {
    return { text: "Sawubona! Ask me anything about payments, deals, deliveries, Willing buyer & seller, getting verified or funding." };
  }
  let best: { s: number; i?: Intent; r?: (typeof ROADMAP)[number] } = { s: 0 };
  for (const i of INTENTS) {
    const s = score(q, i.keywords);
    if (s > best.s) best = { s, i };
  }
  for (const r of ROADMAP) {
    const s = score(q, r.keywords) + 1; // a roadmap hit beats a weak generic match
    if (s > best.s && score(q, r.keywords) > 0) best = { s, r };
  }
  if (best.r) return { text: best.r.answer };
  if (best.i) return { text: best.i.answer, links: best.i.links };
  return { text: FALLBACK };
}

/** The same knowledge, written out for Claude. */
export function helpbotSystemPrompt(role: string) {
  return [
    "You are the MzansiConnect helper, inside a web platform for South African township (kasi) shops.",
    `The person is using the app as a ${role === "owner" ? "shop owner" : role === "admin" ? "MzansiConnect admin" : role === "driver" ? "delivery driver" : "customer"}.`,
    "Answer in 2–4 short, friendly, plain-English sentences. Use rands (R). No markdown headings.",
    "Only describe features listed below. If asked about anything else, say MzansiConnect doesn't have it yet and it may come in a future phase — never invent features, prices or programme details.",
    "FEATURES:",
    ...INTENTS.map((i) => `- ${i.answer}`),
    "NOT YET AVAILABLE (say so honestly):",
    ...ROADMAP.map((r) => `- ${r.answer}`),
  ].join("\n");
}
