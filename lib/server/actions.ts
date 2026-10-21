import {
  Shop,
  Good,
  StockListing,
  ExchangeThread,
  TrainingSession,
  ComplianceDocument,
  PaymentMethodKind,
  FundingOpportunity,
  FundingInterestStatus,
  FundingProfile,
  UserRole,
  PriceTier,
  DeliveryPrefs,
  ApprovalKind,
  CourierPayer,
} from "../types";

export type ServerAction =
  // ---- accounts ----
  | { type: "SIGN_IN"; phone: string; pin: string }
  | { type: "REGISTER_SHOP"; shop: Shop; pin: string; quiz?: { courseId: string; answers: Record<string, number> } }
  | { type: "UPDATE_SHOP"; shopId: string; patch: Partial<Shop> }
  // ---- stock ----
  | { type: "ADD_GOOD"; good: Good }
  | { type: "UPDATE_GOOD"; goodId: string; patch: Partial<Good> }
  | { type: "REMOVE_GOOD"; goodId: string }
  | { type: "RECORD_SALE"; goodId: string; qty: number }
  // ---- deals (shop owners): reserve now, pay through TradeSafe when the deal is full ----
  | { type: "JOIN_DEAL"; dealId: string; shopId: string; qty: number; prefs?: Omit<DeliveryPrefs, "agreedAt"> }
  | { type: "PAY_DEAL"; dealId: string; shopId: string; method: PaymentMethodKind }
  | { type: "PAY_FEE"; feeId: string; shopId: string; method: PaymentMethodKind }
  | { type: "OWNER_SET_PREFS"; dealId: string; shopId: string; prefs: Omit<DeliveryPrefs, "agreedAt"> }
  | { type: "OWNER_CONFIRM"; dealId: string; shopId: string }
  | { type: "RATE_DEAL"; dealId: string; shopId: string; stars: number; comment?: string }
  | { type: "VIEW_DEAL"; dealId: string; shopId: string }
  // ---- partner drop points ----
  | { type: "PARTNER_SETTINGS"; shopId: string; active: boolean; capacityUnits: number }
  | { type: "PARTNER_HANDOVER"; partnerShopId: string; tripId: string; shopId: string; code: string }
  // ---- deals (admin) ----
  | {
      type: "ADMIN_CREATE_DEAL";
      adminName: string;
      wholesalerId: string;
      productName: string;
      unitLabel: string;
      unitWeightKg: number;
      minQty: number;
      tiers: PriceTier[];
      retailPrice: number;
      deliveryFeeCents: number;
      closesInDays: number;
      deliveryWithinDays?: number;
      photo?: string;
    }
  | { type: "ADMIN_SET_DEAL_PHOTO"; dealId: string; photo: string | null }
  | { type: "ADMIN_CONFIRM_PAYMENTS"; dealId: string; adminName: string }
  // after the payment window: drop shops that didn't pay, move the waitlist up
  | { type: "ADMIN_RELEASE_UNPAID"; dealId: string; adminName: string }
  // money leaving a deal needs two admins: one asks, a different one approves
  | { type: "ADMIN_REQUEST_APPROVAL"; kind: ApprovalKind; dealId: string; adminId: string }
  | { type: "ADMIN_DECIDE_APPROVAL"; approvalId: string; adminId: string; approve: boolean; note?: string }
  | {
      type: "ADMIN_ASSIGN_TRIPS";
      dealId: string;
      adminName: string;
      date: string;
      startTime: string;
      trips: { driverId: string; shopIds: string[] }[];
    }
  | { type: "ADMIN_REBOOK"; tripId: string; shopId: string; adminName: string; driverId: string; date: string; window: string }
  | { type: "ADMIN_MARK_COLLECTED"; tripId: string; shopId: string; adminName: string; code: string }
  // ---- drivers ----
  | { type: "DRIVER_ACCEPT"; tripId: string; driverId: string }
  | { type: "DRIVER_COLLECT"; tripId: string; driverId: string }
  | { type: "DRIVER_DELIVER"; tripId: string; driverId: string; shopId: string; code: string }
  | { type: "DRIVER_MISSED"; tripId: string; driverId: string; shopId: string; reason: string; action: "retry-later" | "return" }
  | { type: "DRIVER_LEAVE_AT_PARTNER"; tripId: string; driverId: string; shopId: string; reason: string; code: string }
  // ---- messages ----
  | {
      type: "SEND_MESSAGES";
      fromRole: UserRole;
      fromName: string;
      dealId?: string;
      tripId?: string;
      messages: { toRole: UserRole; toId: string; text: string }[];
    }
  | { type: "MARK_READ"; toRole: UserRole; toId: string }
  // ---- demo helpers ----
  | { type: "SIMULATE_JOIN"; dealId: string; excludeShopId?: string }
  | { type: "SIMULATE_FILL"; dealId: string; excludeShopId?: string }
  | { type: "SIMULATE_PAY"; dealId: string; excludeShopId?: string }
  | { type: "SIMULATE_DEADLINE"; dealId: string }
  | { type: "RESET_DEMO" }
  // ---- willing buyer & seller ----
  | { type: "CREATE_LISTING"; listing: StockListing }
  | { type: "START_THREAD"; thread: ExchangeThread }
  | { type: "SEND_MESSAGE"; threadId: string; fromShopId: string; text: string }
  | {
      type: "SEND_OFFER";
      threadId: string;
      fromShopId: string;
      offerGive: string;
      offerReceive: string;
      cashAdjustment: number;
      giveValue?: number;
      receiveValue?: number;
    }
  | { type: "RESPOND_OFFER"; threadId: string; offerId: string; accept: boolean }
  | { type: "CONFIRM_HANDOVER"; threadId: string; shopId: string }
  | { type: "BOOK_COURIER"; threadId: string; shopId: string; fromShopId: string; twoWay: boolean; payer: CourierPayer; day: string; window: string; goodsOut: string; goodsBack?: string }
  | { type: "CANCEL_COURIER"; jobId: string; shopId: string }
  | { type: "COURIER_ACCEPT"; jobId: string; driverId: string }
  | { type: "COURIER_COLLECT"; jobId: string; driverId: string; leg: number }
  | { type: "COURIER_DELIVER"; jobId: string; driverId: string; leg: number; code: string }
  // ---- training & compliance ----
  | { type: "REGISTER_TRAINING"; sessionId: string; shopId: string; shopName: string }
  | { type: "CANCEL_TRAINING_REGISTRATION"; sessionId: string; shopId: string }
  | { type: "MARK_ATTENDANCE"; sessionId: string; shopId: string; attended: boolean }
  | { type: "CREATE_TRAINING_SESSION"; session: TrainingSession }
  | { type: "SUBMIT_VERIFICATION_DOCS"; shopId: string; shopName: string; documents: ComplianceDocument[] }
  | { type: "DECIDE_VERIFICATION"; requestId: string; decision: "approved" | "rejected"; note: string; decidedBy: string }
  | {
      type: "COMPLETE_COURSE";
      shopId: string;
      shopName: string;
      courseId: string;
      courseTitle: string;
      score: number;
      passMark: number;
      issuedWith: string;
    }
  // ---- funding marketplace ----
  | { type: "SET_FUNDING_INTEREST"; shopId: string; opportunityId: string; status: FundingInterestStatus | null }
  | { type: "SAVE_FUNDING_PROFILE"; profile: FundingProfile }
  | { type: "POST_FUNDING"; opportunity: FundingOpportunity };
