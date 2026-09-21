import { SharedDB } from "./db";
import { ServerAction } from "./actions";
import { uid } from "../id";
import { hashPin, normalizePhone, toSessionAccount } from "./auth";
import { DEMO_PIN_HASH } from "../seed";
import { Account, ConsumerOrder } from "../types";

export interface ReduceResult {
  db: SharedDB;
  meta: Record<string, any>;
}

function isShopVerified(db: SharedDB, shopId: string): boolean {
  const shop = db.shops.find((s) => s.id === shopId);
  return !!shop && shop.verificationStatus === "verified";
}

export function reduce(db: SharedDB, action: ServerAction): ReduceResult {
  const meta: Record<string, any> = {};

  switch (action.type) {
    case "REGISTER_SHOP": {
      const shop = { ...action.shop };
      const accounts = [...db.accounts];
      const existingIndex = accounts.findIndex(
        (a) =>
          a.shopId === shop.id ||
          (a.role === "owner" && normalizePhone(a.phone) === normalizePhone(shop.phone))
      );
      const account: Account = {
        id: existingIndex >= 0 ? accounts[existingIndex].id : uid("acc"),
        role: "owner",
        name: shop.ownerName || shop.name,
        phone: shop.phone,
        // falling back to the demo PIN keeps a shop reachable locally even when
        // no PIN was supplied by the registration form
        pinHash: action.pin ? hashPin(action.pin) : DEMO_PIN_HASH,
        shopId: shop.id,
        demo: !action.pin,
        createdAt: shop.createdAt,
      };
      if (existingIndex >= 0) accounts[existingIndex] = account;
      else accounts.push(account);
      meta.account = toSessionAccount(account);
      return { db: { ...db, shops: [...db.shops, shop], accounts }, meta };
    }

    case "UPDATE_SHOP": {
      const shops = db.shops.map((s) => (s.id === action.shopId ? { ...s, ...action.patch } : s));
      const shop = shops.find((s) => s.id === action.shopId);
      // keep the owner's sign-in account in step with their shop details
      const accounts = shop
        ? db.accounts.map((a) =>
            a.shopId === shop.id ? { ...a, phone: shop.phone, name: shop.ownerName || a.name } : a
          )
        : db.accounts;
      return { db: { ...db, shops, accounts }, meta };
    }

    case "ADD_GOOD":
      return { db: { ...db, goods: [...db.goods, action.good] }, meta };

    case "UPDATE_GOOD":
      return {
        db: {
          ...db,
          goods: db.goods.map((g) => (g.id === action.goodId ? { ...g, ...action.patch } : g)),
        },
        meta,
      };

    case "REMOVE_GOOD":
      return { db: { ...db, goods: db.goods.filter((g) => g.id !== action.goodId) }, meta };

    case "PLACE_ORDER": {
      if (!isShopVerified(db, action.shopId)) {
        return { db, meta: { error: "Shop is not verified yet" } };
      }
      const goodsMap = new Map(db.goods.map((g) => [g.id, g]));
      for (const item of action.items) {
        const good = goodsMap.get(item.goodId);
        if (!good || good.stockQty < item.qty) {
          return { db, meta: { error: "Not enough stock" } };
        }
      }
      const total = action.items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const platformFee = Math.round(total * 0.03 * 100) / 100;
      const order: ConsumerOrder = {
        id: uid("order"),
        shopId: action.shopId,
        consumerName: action.consumerName || "Guest customer",
        consumerPhone: action.consumerPhone || "",
        items: action.items,
        fulfilment: action.fulfilment,
        payment: action.payment,
        note: action.note,
        status: "placed",
        total,
        platformFee,
        createdAt: new Date().toISOString(),
      };
      const updatedGoods = db.goods.map((g) => {
        const item = action.items.find((i) => i.goodId === g.id);
        return item ? { ...g, stockQty: g.stockQty - item.qty } : g;
      });
      meta.orderId = order.id;
      return {
        db: { ...db, goods: updatedGoods, orders: [order, ...db.orders] },
        meta,
      };
    }

    case "SET_ORDER_STATUS":
      return {
        db: {
          ...db,
          orders: db.orders.map((o) => (o.id === action.orderId ? { ...o, status: action.status } : o)),
        },
        meta,
      };

    case "JOIN_POOL": {
      if (!isShopVerified(db, action.shopId)) {
        return { db, meta: { error: "Shop is not verified yet" } };
      }
      return {
        db: {
          ...db,
          pools: db.pools.map((p) =>
            p.id === action.poolId
              ? {
                  ...p,
                  commitments: [
                    ...p.commitments,
                    {
                      shopId: action.shopId,
                      shopName: action.shopName,
                      township: action.township,
                      qty: action.qty,
                      paid: true,
                      joinedAt: new Date().toISOString(),
                    },
                  ],
                }
              : p
          ),
        },
        meta,
      };
    }

    case "SET_POOL_STATUS":
      return {
        db: { ...db, pools: db.pools.map((p) => (p.id === action.poolId ? { ...p, status: action.status } : p)) },
        meta,
      };

    case "CREATE_LISTING": {
      if (!isShopVerified(db, action.listing.shopId)) {
        return { db, meta: { error: "Shop is not verified yet" } };
      }
      return { db: { ...db, listings: [action.listing, ...db.listings] }, meta };
    }

    case "START_THREAD": {
      if (!isShopVerified(db, action.thread.shopBId)) {
        return { db, meta: { error: "Shop is not verified yet" } };
      }
      return { db: { ...db, threads: [...db.threads, action.thread] }, meta };
    }

    case "SEND_MESSAGE":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  messages: [
                    ...t.messages,
                    { id: uid("msg"), fromShopId: action.fromShopId, text: action.text, createdAt: new Date().toISOString() },
                  ],
                }
              : t
          ),
        },
        meta,
      };

    case "SEND_OFFER":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  offers: [
                    ...t.offers,
                    {
                      id: uid("offer"),
                      fromShopId: action.fromShopId,
                      offerGive: action.offerGive,
                      offerReceive: action.offerReceive,
                      cashAdjustment: action.cashAdjustment,
                      status: "pending",
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : t
          ),
        },
        meta,
      };

    case "RESPOND_OFFER":
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  offers: t.offers.map((o) =>
                    o.id === action.offerId ? { ...o, status: action.accept ? "accepted" : "declined" } : o
                  ),
                }
              : t
          ),
        },
        meta,
      };

    case "CONFIRM_HANDOVER": {
      return {
        db: {
          ...db,
          threads: db.threads.map((t) => {
            if (t.id !== action.threadId) return t;
            const confirmedBy = Array.from(new Set([...t.confirmedBy, action.shopId]));
            const bothConfirmed = confirmedBy.includes(t.shopAId) && confirmedBy.includes(t.shopBId);
            return { ...t, confirmedBy, status: bothConfirmed ? "completed" : t.status };
          }),
        },
        meta,
      };
    }

    case "REGISTER_TRAINING":
      return {
        db: {
          ...db,
          trainingSessions: db.trainingSessions.map((s) =>
            s.id === action.sessionId && !s.attendees.some((a) => a.shopId === action.shopId)
              ? {
                  ...s,
                  attendees: [
                    ...s.attendees,
                    { shopId: action.shopId, shopName: action.shopName, registeredAt: new Date().toISOString(), attended: false },
                  ],
                }
              : s
          ),
        },
        meta,
      };

    case "CANCEL_TRAINING_REGISTRATION":
      return {
        db: {
          ...db,
          trainingSessions: db.trainingSessions.map((s) =>
            s.id === action.sessionId ? { ...s, attendees: s.attendees.filter((a) => a.shopId !== action.shopId) } : s
          ),
        },
        meta,
      };

    case "MARK_ATTENDANCE":
      return {
        db: {
          ...db,
          trainingSessions: db.trainingSessions.map((s) =>
            s.id === action.sessionId
              ? { ...s, attendees: s.attendees.map((a) => (a.shopId === action.shopId ? { ...a, attended: action.attended } : a)) }
              : s
          ),
        },
        meta,
      };

    case "CREATE_TRAINING_SESSION":
      return { db: { ...db, trainingSessions: [...db.trainingSessions, action.session] }, meta };

    case "SUBMIT_VERIFICATION_DOCS": {
      const request = {
        id: uid("vr"),
        shopId: action.shopId,
        shopName: action.shopName,
        method: "document" as const,
        documents: action.documents,
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
      };
      meta.requestId = request.id;
      return {
        db: {
          ...db,
          verificationRequests: [request, ...db.verificationRequests],
          shops: db.shops.map((s) =>
            s.id === action.shopId
              ? { ...s, verificationStatus: "pending", verificationMethod: "document" }
              : s
          ),
        },
        meta,
      };
    }

    case "DECIDE_VERIFICATION": {
      const request = db.verificationRequests.find((r) => r.id === action.requestId);
      if (!request) return { db, meta: { error: "Request not found" } };
      const updatedRequests = db.verificationRequests.map((r) =>
        r.id === action.requestId
          ? { ...r, status: action.decision, note: action.note, decidedBy: action.decidedBy, decidedAt: new Date().toISOString() }
          : r
      );
      const updatedShops = db.shops.map((s) =>
        s.id === request.shopId
          ? {
              ...s,
              verificationStatus: action.decision === "approved" ? ("verified" as const) : ("rejected" as const),
              verified: action.decision === "approved",
              verifiedAt: action.decision === "approved" ? new Date().toISOString() : s.verifiedAt,
            }
          : s
      );
      return { db: { ...db, verificationRequests: updatedRequests, shops: updatedShops }, meta };
    }

    case "COMPLETE_COURSE": {
      const passed = action.score >= action.passMark;
      meta.passed = passed;
      if (!passed) return { db, meta };
      const certificate = {
        id: uid("cert"),
        shopId: action.shopId,
        shopName: action.shopName,
        courseId: action.courseId,
        courseTitle: action.courseTitle,
        score: action.score,
        certificateNumber: `MZB-CC-${Math.floor(100000 + Math.random() * 899999)}`,
        issuedAt: new Date().toISOString(),
        issuedWith: action.issuedWith,
      };
      meta.certificateId = certificate.id;
      return {
        db: {
          ...db,
          certificates: [certificate, ...db.certificates],
          shops: db.shops.map((s) =>
            s.id === action.shopId
              ? {
                  ...s,
                  verificationStatus: "verified",
                  verified: true,
                  verificationMethod: "course",
                  verifiedAt: new Date().toISOString(),
                }
              : s
          ),
        },
        meta,
      };
    }

    default:
      return { db, meta };
  }
}
