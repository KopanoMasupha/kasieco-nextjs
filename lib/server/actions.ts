import {
  Shop,
  Good,
  ConsumerOrderItem,
  Pool,
  StockListing,
  ExchangeThread,
  FulfilmentType,
  PaymentMethod,
  OrderStatus,
  TrainingSession,
  ComplianceDocument,
} from "../types";

export type ServerAction =
  | { type: "REGISTER_SHOP"; shop: Shop; pin?: string }
  | { type: "UPDATE_SHOP"; shopId: string; patch: Partial<Shop> }
  | { type: "ADD_GOOD"; good: Good }
  | { type: "UPDATE_GOOD"; goodId: string; patch: Partial<Good> }
  | { type: "REMOVE_GOOD"; goodId: string }
  | {
      type: "PLACE_ORDER";
      shopId: string;
      items: ConsumerOrderItem[];
      fulfilment: FulfilmentType;
      payment: PaymentMethod;
      note: string;
      consumerName: string;
      consumerPhone: string;
    }
  | { type: "SET_ORDER_STATUS"; orderId: string; status: OrderStatus }
  | { type: "JOIN_POOL"; poolId: string; shopId: string; shopName: string; township: string; qty: number }
  | { type: "SET_POOL_STATUS"; poolId: string; status: Pool["status"] }
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
    }
  | { type: "RESPOND_OFFER"; threadId: string; offerId: string; accept: boolean }
  | { type: "CONFIRM_HANDOVER"; threadId: string; shopId: string }
  | { type: "REGISTER_TRAINING"; sessionId: string; shopId: string; shopName: string }
  | { type: "CANCEL_TRAINING_REGISTRATION"; sessionId: string; shopId: string }
  | { type: "MARK_ATTENDANCE"; sessionId: string; shopId: string; attended: boolean }
  | { type: "CREATE_TRAINING_SESSION"; session: TrainingSession }
  | { type: "SUBMIT_VERIFICATION_DOCS"; shopId: string; shopName: string; documents: ComplianceDocument[] }
  | {
      type: "DECIDE_VERIFICATION";
      requestId: string;
      decision: "approved" | "rejected";
      note: string;
      decidedBy: string;
    }
  | {
      type: "COMPLETE_COURSE";
      shopId: string;
      shopName: string;
      courseId: string;
      courseTitle: string;
      score: number;
      passMark: number;
      issuedWith: string;
    };
