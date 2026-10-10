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
  FundingApplication,
  FundingProfile,
  FundingProgramme,
} from "../types";
import { PotPaymentMethod } from "../types";

export type ServerAction =
  | { type: "REGISTER_SHOP"; shop: Shop; pin?: string }
  | { type: "UPDATE_SHOP"; shopId: string; patch: Partial<Shop> }
  | { type: "ADD_GOOD"; good: Good }
  | { type: "UPDATE_GOOD"; goodId: string; patch: Partial<Good> }
  | { type: "REMOVE_GOOD"; goodId: string }
  | { type: "RECORD_SALE"; shopId: string; goodId: string; qty: number }
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
  | { type: "CREATE_POOL"; shopId: string; productId: string }
  | { type: "JOIN_POOL"; poolId: string; shopId: string; qty: number; method: PotPaymentMethod; expectedCents: number }
  | { type: "CLOSE_POOL"; poolId: string; shopId: string }
  | { type: "CANCEL_POOL"; poolId: string; shopId: string }
  | { type: "COMPLETE_POOL_DELIVERY"; poolId: string; shopId: string }
  | { type: "SAVE_FUNDING_PROFILE"; profile: FundingProfile }
  | { type: "SET_FUNDING_APPLICATION"; application: FundingApplication }
  | { type: "PUBLISH_FUNDING_PROGRAMME"; programme: FundingProgramme }
  | { type: "CREATE_LISTING"; listing: StockListing }
  | { type: "START_THREAD"; thread: ExchangeThread }
  | { type: "SEND_MESSAGE"; threadId: string; fromShopId: string; text: string }
  | {
      type: "SEND_OFFER";
      threadId: string;
      fromShopId: string;
      giveGoodId: string;
      giveQty: number;
      receiveGoodId: string;
      receiveQty: number;
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
