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
  hours: string;
  offersDelivery: boolean;
  acceptsOrders: boolean;
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
  hidden: boolean;
}

export type OrderStatus = "placed" | "accepted" | "ready" | "collected" | "rejected";
export type FulfilmentType = "pickup" | "delivery";
export type PaymentMethod = "cash" | "online";

export interface ConsumerOrderItem {
  goodId: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
}

export interface ConsumerOrder {
  id: string;
  shopId: string;
  consumerName: string;
  consumerPhone: string;
  items: ConsumerOrderItem[];
  fulfilment: FulfilmentType;
  payment: PaymentMethod;
  note: string;
  status: OrderStatus;
  total: number;
  platformFee: number;
  createdAt: string;
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
  paid: boolean;
  joinedAt: string;
}

export interface Pool {
  id: string;
  productName: string;
  unitLabel: string;
  supplierName: string;
  supplierVerified: boolean;
  minQty: number;
  tiers: PriceTier[];
  commitments: PoolCommitment[];
  closesAt: string;
  status: "open" | "closed" | "delivering" | "delivered";
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
  cashAdjustment: number;
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

/** Which side of the platform this browser session is viewing. */
export type Role = "consumer" | "owner" | "verifier";

/**
 * Sign-in is for **shop owners only** — shoppers browse the map and shop pages
 * without an account, so "customer" accounts don't exist.
 */
export type AccountRole = "owner";

/**
 * A local sign-in account. Stored server-side in `data/db.json` with a hashed
 * PIN (see `lib/server/auth.ts`) and never sent to the browser — only the
 * sanitised `SessionAccount` below is.
 */
export interface Account {
  id: string;
  role: AccountRole;
  name: string;
  phone: string;
  pinHash: string;
  /** The shop this owner account signs in to. */
  shopId: string | null;
  /** True for the seeded demo accounts listed on the sign-in page. */
  demo: boolean;
  createdAt: string;
}

/** The safe subset of an Account that is kept in the browser session. */
export interface SessionAccount {
  id: string;
  role: AccountRole;
  name: string;
  phone: string;
  shopId: string | null;
  demo: boolean;
}

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

