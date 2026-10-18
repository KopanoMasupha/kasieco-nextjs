export type ShopCategory =
  | "spaza"
  | "tuckshop"
  | "butchery"
  | "greengrocer"
  | "takeaway"
  | "hairdresser"
  | "caterer"
  | "other";

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  spaza: "Spaza shop",
  tuckshop: "Tuckshop",
  butchery: "Butchery",
  greengrocer: "Fresh produce",
  takeaway: "Kota / takeaway",
  hairdresser: "Hair salon",
  caterer: "Caterer",
  other: "Other",
};

export type GoodsCategory =
  | "groceries"
  | "fresh produce"
  | "airtime"
  | "cooked food"
  | "meat"
  | "bakery"
  | "household"
  | "toiletries";

export type VerificationStatus =
  | "draft" // registered, hasn't started compliance yet
  | "pending" // documents submitted, awaiting a verifier
  | "verified" // approved — visible to customers, can trade
  | "rejected" // a verifier declined the submission
  | "expired"; // was verified, a document has lapsed

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  draft: "Not yet compliant",
  pending: "Under review",
  verified: "Verified",
  rejected: "Resubmission needed",
  expired: "Compliance expired",
};

export interface ShopSocials {
  whatsapp?: string; // phone number in local format
  facebook?: string; // full URL
  instagram?: string; // handle without @
  tiktok?: string; // handle without @
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  ownerName: string;
  phone: string;
  category: ShopCategory;
  township: string;
  lat: number;
  lng: number;
  hours: string; // human-readable, e.g. "06:00 - 20:00 every day"
  openTime: string; // "06:00"
  closeTime: string; // "20:00"
  openDays: number[]; // 0 = Sunday ... 6 = Saturday
  offersDelivery: boolean;
  socials?: ShopSocials;
  address?: string; // street/stand, for drivers
  partner?: PartnerDropPoint; // this shop holds neighbours' missed deliveries
  verified: boolean; // legacy display flag, derived from verificationStatus === "verified"
  verificationStatus: VerificationStatus;
  verificationMethod?: "document" | "course" | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface Good {
  id: string;
  shopId: string;
  name: string;
  category: GoodsCategory;
  unit: string;
  price: number;
  stockQty: number;
  soldLast7Days: number; // logged by the owner ("Record a sale") — feeds the stock AI
  hidden: boolean;
  photo?: string; // the owner's own photo (compressed data URL) — customers see it on the shelf
}

export interface PriceTier {
  minQty: number;
  price: number;
}

export interface PoolCommitment {
  shopId: string;
  shopName: string;
  township: string;
  qty: number;
  joinedAt: string;
  prefs?: DeliveryPrefs; // chosen when joining; can be changed until the stock is collected
}

// ---- delivery choices ----

/** What should happen if the driver comes and nobody can receive the stock. */
export type MissedChoice = "retry-later" | "partner" | "next-run" | "collect";

export const MISSED_CHOICES: { id: MissedChoice; title: string; help: string; cost: string }[] = [
  { id: "retry-later", title: "Come back later today", help: "Driver returns after the other stops.", cost: "Free" },
  { id: "partner", title: "Leave it at my partner shop", help: "A trusted shop nearby holds it for 72 hours.", cost: "R5 a unit" },
  { id: "next-run", title: "Bring it on the next delivery run", help: "We rebook a new time.", cost: "Free once" },
  { id: "collect", title: "I'll collect it at the wholesaler", help: "Show your code at the wholesaler.", cost: "Free" },
];

export interface DeliveryPrefs {
  days: number[]; // weekdays the shop can receive: 1 = Monday … 6 = Saturday
  time: "morning" | "afternoon" | "any"; // morning = before 12:00, afternoon = after 12:00
  ifMissed: MissedChoice;
  partnerShopId?: string; // required when ifMissed === "partner"
  backupName?: string; // someone else allowed to receive (family, staff)
  backupPhone?: string;
  agreedAt: string; // when the owner accepted the delivery rules and fees
}

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface PartnerDropPoint {
  active: boolean;
  capacityUnits: number; // how many units of other shops' stock it can hold at once
  dropCode: string; // 4 digits the driver must enter to leave stock here
  agreedAt: string; // signed the partner agreement (lockable storeroom, 72 h, don't open or sell)
}

export const PARTNER_FEE_PER_UNIT_CENTS = 500;
export const REDELIVERY_FEE_CENTS = 3000;
export const PARTNER_RADIUS_KM = 2;
export const REBOOK_TRIP_FEE_CENTS = 6000; // paid by MzansiConnect (or the re-delivery fee), not from the deal's pot

export type PaymentMethodKind = "eft" | "card" | "cash";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodKind, string> = {
  eft: "Instant EFT",
  card: "Bank card",
  cash: "Cash at a till",
};

/** Shops' money is held in escrow by our payment partner — never in MzansiConnect's own account. */
export const ESCROW_PROVIDER = "TradeSafe";
/** Once a deal is full, every shop has this long to pay its share. */
export const PAYMENT_WINDOW_HOURS = 48;

/**
 * One line in a deal's pot ledger. Append-only: nothing is ever edited or
 * deleted, so the pot balance can always be re-proven from scratch.
 * All money is in CENTS (integers) so the arithmetic is exact.
 */
export type PotTransactionType =
  | "contribution" // a shop pays its share into the pot (via TradeSafe, at the final price)
  | "rebate" // (no longer used: shops pay the final price, so there's nothing to hand back)
  | "refund" // paid back to the shop's bank by TradeSafe because the deal was cancelled
  | "payout-supplier" // goods paid to the wholesaler when the admin places the order
  | "payout-driver" // a driver paid when their trip is completed
  | "payout-platform"; // MzansiConnect service fee, taken when everything is delivered

export interface PotTransaction {
  id: string;
  ref: string; // human-readable reference, e.g. KE-7F3K2Q
  type: PotTransactionType;
  shopId?: string;
  shopName?: string;
  qty?: number;
  amountCents: number; // always positive; direction comes from `type`
  method?: PaymentMethodKind;
  unitPriceCents?: number;
  note: string;
  createdAt: string;
  balanceAfterCents: number;
}

/** Where a deal is in its life. Each step is unlocked by the one before. */
export type DealStatus =
  | "open" // shops are joining
  | "target-reached" // lot sold out; waiting for an admin to check the money
  | "payment-confirmed" // admin checked every payment
  | "ordered" // admin paid the wholesaler and placed the order
  | "scheduled" // delivery planned, drivers assigned
  | "out-for-delivery" // at least one driver has collected
  | "delivered" // every shop has its stock
  | "cancelled"; // target not reached — everyone refunded

export const DEAL_STEPS: { status: DealStatus; label: string; ownerHelp: string }[] = [
  { status: "open", label: "Joining", ownerHelp: "The deal is filling up. The price drops as more shops join." },
  { status: "target-reached", label: "Full · pay", ownerHelp: "The deal is full. Every shop pays its share into TradeSafe escrow within 48 hours." },
  { status: "payment-confirmed", label: "Paid", ownerHelp: "Every shop has paid and MzansiConnect has checked it. The order goes to the wholesaler next." },
  { status: "ordered", label: "Ordered", ownerHelp: "MzansiConnect has paid the wholesaler. Your delivery is being planned." },
  { status: "scheduled", label: "Booked", ownerHelp: "A driver and a time slot are booked for your shop." },
  { status: "out-for-delivery", label: "On the way", ownerHelp: "The driver has collected the stock and is driving the route." },
  { status: "delivered", label: "Delivered", ownerHelp: "Every shop has its stock. The deal is finished." },
];

export interface DealEvent {
  at: string;
  text: string;
  by: string; // "System", an admin name, a driver name, a shop name
}

export interface Pool {
  id: string;
  wholesalerId: string;
  productName: string;
  unitLabel: string; // e.g. "bale (10 × 5kg)"
  unitWeightKg: number; // for vehicle loading
  supplierName: string; // the wholesaler's name (kept for older components)
  supplierVerified: boolean;
  minQty: number; // the lot size: the deal closes the moment this many units are sold
  tiers: PriceTier[]; // prices in rands; the last tier applies at the target
  retailPrice: number; // what a shop would pay buying alone, for the savings message
  commitments: PoolCommitment[];
  deliveryFeeCents: number; // transport, split by units, paid to drivers
  serviceFeeRate: number; // e.g. 0.02
  ledger: PotTransaction[];
  createdAt: string;
  closesAt: string;
  status: DealStatus;
  events: DealEvent[];
  poNumber?: string;
  deliveryCodes: Record<string, string>; // shopId → 4-digit code the owner gives the driver
  backupCodes: Record<string, string>; // shopId → code for the owner's named backup receiver
  deliveryWithinDays: number; // promise: delivered within this many days after the deal is full
  targetReachedAt?: string;
  paymentDueAt?: string; // set when the deal fills: shops pay their share by then
  priceLockedCents?: number; // unit price fixed the moment the deal first fills
  waitlist: PoolCommitment[]; // shops that asked for units after the deal was full
  tripIds: string[];
  ratings: DealRating[]; // shops rate the deal once their stock has arrived
  views: Record<string, string>; // shopId → last time that shop opened the deal (real "viewed by" counts)
  photo?: string; // product photo from the wholesaler (compressed data URL)
}

/** A shop's rating of a finished deal: the wholesaler's stock and the delivery. */
export interface DealRating {
  shopId: string;
  township: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  at: string;
}
export type Deal = Pool;

export interface Wholesaler {
  id: string;
  name: string;
  address: string;
  township: string;
  lat: number;
  lng: number;
  phone: string;
  verified: boolean;
}

// ---- payments (held in escrow by TradeSafe) ----

export type PaymentTxType =
  | "deal-payment" // shop → TradeSafe escrow, its share of a full deal
  | "fee-payment" // shop → TradeSafe, a drop-point or re-delivery fee
  | "refund" // TradeSafe escrow → the shop's bank, because the deal was cancelled
  | "fee-payout"; // TradeSafe → a drop-point shop's bank, its R5-a-unit earnings

/** TradeSafe's record of money moving for a shop. Append-only, integer cents. */
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

/** A small charge an owner owes after a missed delivery, paid through TradeSafe. */
export interface Fee {
  id: string;
  kind: "drop-point" | "redelivery";
  shopId: string;
  shopName: string;
  dealId: string;
  amountCents: number;
  toShopId?: string; // drop point that earns it
  toShopName?: string;
  note: string;
  createdAt: string;
  status: "due" | "paid";
  paidAt?: string;
  ref?: string;
}

// ---- people & sign-in ----

export type UserRole = "owner" | "admin" | "driver" | "verifier";

export interface UserAccount {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  pin?: string; // server only — stripped before anything reaches a browser
  shopId?: string;
  driverId?: string;
  adminRole?: AdminRole; // admins only: their main job (both can cover for each other)
  townships?: string[]; // admins only: the areas they look after
}

export type AdminRole = "money" | "dispatch";
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  money: "Deals & money",
  dispatch: "Deliveries & drivers",
};

/** Two-person rule: money leaving a deal needs a second admin to say yes. */
export type ApprovalKind = "place-order" | "cancel-deal";
export interface Approval {
  id: string;
  kind: ApprovalKind;
  dealId: string;
  amountCents: number;
  summary: string; // e.g. "Pay Highveld Milling R11 040 for 30 bales"
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  decidedById?: string;
  decidedByName?: string;
  decidedAt?: string;
  note?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string; // e.g. "1-ton bakkie"
  plate: string;
  capacityKg: number;
  baseTownship: string;
  lat: number;
  lng: number;
}

// ---- delivery trips ----

export type StopStatus =
  | "pending" // on the vehicle, not handed over yet
  | "delivered" // the owner (or backup receiver) has it — code checked
  | "at-partner" // missed; left at the owner's partner shop, waiting for pickup
  | "returned" // missed; taken back to the wholesaler (owner collects, or MzansiConnect rebooks)
  | "rebooked"; // a returned stop that now has a new trip

export interface TripStop {
  shopId: string;
  shopName: string;
  township: string;
  lat: number;
  lng: number;
  qty: number;
  weightKg: number;
  window: string; // e.g. "10:20 – 10:50"
  status: StopStatus;
  feeCents: number; // the driver's pay for this stop, from the deal's pot (0 on a rebooked trip)
  paid?: boolean; // the stop fee has been paid out
  attempts: number;
  confirmed?: boolean; // the owner tapped "I'll be there"
  deliveredAt?: string;
  handedTo?: "owner" | "backup" | "partner-pickup" | "wholesaler-pickup";
  missReason?: string;
  partnerShopId?: string;
  partnerShopName?: string;
  atPartnerAt?: string;
  returnedAt?: string;
  nextRun?: boolean; // returned and MzansiConnect must rebook (otherwise the owner collects)
  rebookedTripId?: string;
}

export type TripStatus = "assigned" | "accepted" | "collected" | "completed";

export interface Trip {
  id: string;
  dealId: string;
  driverId: string;
  driverName: string;
  vehicle: string;
  capacityKg: number;
  date: string; // YYYY-MM-DD
  startTime: string; // "08:00"
  pickup: { name: string; address: string; lat: number; lng: number; window: string };
  stops: TripStop[];
  loadKg: number;
  status: TripStatus;
  feeCents: number; // total driver pay for the trip (sum of the stops' fees, or the rebook fee)
  paidBy: "pot" | "kasieco"; // a rebooked trip is paid by MzansiConnect, not from the deal
  rebookOf?: string; // trip id this one re-delivers for
  createdAt: string;
}

// ---- messages ----

export interface Message {
  id: string;
  toRole: UserRole;
  toId: string; // shopId, driverId, or "admin"
  fromName: string;
  fromRole: UserRole | "system";
  dealId?: string;
  tripId?: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export type ListingType = "have" | "need";

export interface StockListing {
  id: string;
  shopId: string;
  shopName: string;
  township: string;
  lat: number;
  lng: number;
  type: ListingType;
  item: string;
  qty: number;
  unit: string;
  wantInReturn: string;
  price: number | null;
  createdAt: string;
  status: "open" | "matched" | "closed";
}

export interface ExchangeOffer {
  id: string;
  fromShopId: string;
  offerGive: string;
  offerReceive: string;
  cashAdjustment: number; // rands; positive = sender adds cash, negative = sender asks for cash
  giveValue?: number; // fair value in rands at average kasi prices
  receiveValue?: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface ExchangeMessage {
  id: string;
  fromShopId: string;
  text: string;
  createdAt: string;
}

export interface ExchangeThread {
  id: string;
  listingId: string;
  shopAId: string; // listing owner
  shopBId: string; // the other shop
  messages: ExchangeMessage[];
  offers: ExchangeOffer[];
  confirmedBy: string[]; // shop ids who confirmed hand-over
  status: "open" | "completed";
  createdAt: string;
}

export type Role = "consumer" | "owner" | "verifier" | "admin" | "driver";

export type TrainingTopic =
  | "business-registration"
  | "food-safety"
  | "inventory-management"
  | "financial-management";

export const TRAINING_TOPIC_LABEL: Record<TrainingTopic, string> = {
  "business-registration": "CIPC, SARS & UIF registration",
  "food-safety": "Health & food safety compliance",
  "inventory-management": "Inventory management & POS",
  "financial-management": "Basic bookkeeping & financial management",
};

export interface TrainingAttendee {
  shopId: string;
  shopName: string;
  registeredAt: string;
  attended: boolean;
}

export interface TrainingSession {
  id: string;
  title: string;
  provider: string; // e.g. "Wholesale & Retail SETA (with Sefa)"
  topic: TrainingTopic;
  township: string;
  venue: string;
  lat: number;
  lng: number;
  date: string; // ISO date-time
  capacity: number;
  attendees: TrainingAttendee[];
  notes: string;
}

// ---- Compliance documents & verification ----

export type ComplianceDocType =
  | "cipc-registration"
  | "tax-clearance"
  | "certificate-of-acceptability"
  | "municipal-trading-licence"
  | "id-document"
  | "other";

export const COMPLIANCE_DOC_LABEL: Record<ComplianceDocType, string> = {
  "cipc-registration": "CIPC business registration",
  "tax-clearance": "SARS tax clearance",
  "certificate-of-acceptability": "Certificate of Acceptability (food safety)",
  "municipal-trading-licence": "Municipal trading licence / permit",
  "id-document": "Owner ID document",
  other: "Other supporting document",
};

export interface ComplianceDocument {
  id: string;
  docType: ComplianceDocType;
  fileName: string;
  dataUrl: string; // base64 preview/content for this prototype
  referenceNumber?: string;
}

export interface VerificationRequest {
  id: string;
  shopId: string;
  shopName: string;
  method: "document" | "course";
  documents: ComplianceDocument[];
  courseCertificateId?: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  decidedBy?: string;
  decidedAt?: string;
  submittedAt: string;
}

// ---- Compliance LMS (courses, quizzes, certificates) ----

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  body: string[]; // paragraphs
}

export interface Course {
  id: string;
  title: string;
  summary: string;
  issuedWith: string; // e.g. "Dept. of Small Business Development pilot programme"
  lessons: Lesson[];
  quiz: QuizQuestion[];
  passMark: number; // fraction, e.g. 0.7
}

export interface Certificate {
  id: string;
  shopId: string;
  shopName: string;
  courseId: string;
  courseTitle: string;
  score: number;
  certificateNumber: string;
  issuedAt: string;
  issuedWith: string;
}

// ---- AI stock insights ----

export type StockInsightStatus = "healthy" | "low" | "overstock";

export interface StockInsight {
  goodId: string;
  name: string;
  unitsSoldRecent: number;
  stockQty: number;
  daysOfCover: number | null; // how long current stock lasts at the current sales pace
  status: StockInsightStatus;
  suggestion: string;
  matchShopId?: string;
  matchShopName?: string;
  matchDistanceKm?: number;
}

export interface AiReport {
  shopId: string;
  generatedAt: string;
  narrative: string;
  narrativeSource: "template" | "claude";
  insights: StockInsight[];
}


// ---- Funding opportunities marketplace ----

export type FundingKind = "grant" | "loan" | "blended" | "training" | "mentorship";

export const FUNDING_KIND_LABEL: Record<FundingKind, string> = {
  grant: "Grant",
  loan: "Loan",
  blended: "Grant + loan",
  training: "Training",
  mentorship: "Mentorship",
};

export interface FundingCriteria {
  requiresVerified?: boolean; // compliant on MzansiConnect
  requiresCipc?: boolean;
  requiresTradingPermit?: boolean;
  minTradingMonths?: number;
  ageMin?: number;
  ageMax?: number;
  townshipOrRural?: boolean;
  foodBusinessesOnly?: boolean;
}

export interface FundingOpportunity {
  id: string;
  name: string;
  provider: string;
  kind: FundingKind;
  amountText: string; // e.g. "Up to R100 000"
  summary: string;
  offers: string[];
  eligibility: string[];
  criteria: FundingCriteria;
  priority?: string; // who gets priority
  howToApply: string[];
  applyUrl: string;
  contact?: string;
  deadline: string | null; // ISO date, null = rolling / open
  lastChecked: string; // when the MzansiConnect team last checked the details
  postedBy: string; // "MzansiConnect team" or a verifier/partner name
}

export type FundingInterestStatus = "saved" | "preparing" | "applied";

export interface FundingInterest {
  shopId: string;
  opportunityId: string;
  status: FundingInterestStatus;
  updatedAt: string;
}

/** Self-declared answers an owner gives once so we can pre-check eligibility. */
export interface FundingProfile {
  shopId: string;
  ownerAge?: number;
  tradingMonths?: number;
  hasCipc?: boolean;
  hasTradingPermit?: boolean;
  womanOwned?: boolean;
}
