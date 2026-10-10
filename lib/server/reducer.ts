import { SharedDB } from "./db";
import { ServerAction } from "./actions";
import { uid } from "../id";
import { hashPin, normalizePhone, toSessionAccount } from "./auth";
import { DEMO_PIN_HASH } from "../seed";
import { Account, ConsumerOrder } from "../types";
import { auditPot, ledgerEntry, priceForQty, quoteForMembers, quoteJoin, totalPoolQty } from "../pot";
import { WHOLESALE_CATALOGUE } from "../wholesalers";

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
      const {
        verified: _verified,
        verificationStatus: _verificationStatus,
        verificationMethod: _verificationMethod,
        verifiedAt: _verifiedAt,
        ...safePatch
      } = action.patch;
      const shops = db.shops.map((s) => (s.id === action.shopId ? { ...s, ...safePatch } : s));
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

    case "RECORD_SALE": {
      const shop = db.shops.find((item) => item.id === action.shopId);
      const good = db.goods.find((item) => item.id === action.goodId && item.shopId === action.shopId);
      if (!shop || !isShopVerified(db, action.shopId)) return { db, meta: { error: "Only verified shops can record sales" } };
      if (!good) return { db, meta: { error: "Stock item not found" } };
      if (!Number.isInteger(action.qty) || action.qty < 1) return { db, meta: { error: "Enter a valid sale quantity" } };
      if (good.stockQty < action.qty) return { db, meta: { error: "Sale quantity exceeds current stock" } };
      const sale = { id: uid("sale"), shopId: shop.id, goodId: good.id, qty: action.qty, createdAt: new Date().toISOString() };
      return {
        db: {
          ...db,
          goods: db.goods.map((item) => item.id === good.id ? { ...item, stockQty: item.stockQty - action.qty } : item),
          sales: [...(db.sales ?? []), sale],
        },
        meta,
      };
    }

    case "SAVE_FUNDING_PROFILE": {
      const profile = action.profile;
      if (!db.shops.some((shop) => shop.id === profile.shopId)) return { db, meta: { error: "Shop not found" } };
      if (![profile.age, profile.monthsTrading].every(Number.isFinite) || profile.age < 0 || profile.monthsTrading < 0) {
        return { db, meta: { error: "Enter valid age and trading history" } };
      }
      const profiles = [...(db.fundingProfiles ?? []).filter((item) => item.shopId !== profile.shopId), profile];
      return { db: { ...db, fundingProfiles: profiles }, meta };
    }

    case "SET_FUNDING_APPLICATION": {
      if (!db.shops.some((shop) => shop.id === action.application.shopId)) return { db, meta: { error: "Shop not found" } };
      if (!db.fundingProgrammes.some((programme) => programme.id === action.application.programmeId)) return { db, meta: { error: "Funding programme not found" } };
      const existing = (db.fundingApplications ?? []).find((item) => item.shopId === action.application.shopId && item.programmeId === action.application.programmeId);
      const application = { ...action.application, id: existing?.id ?? uid("funding-app"), updatedAt: new Date().toISOString() };
      const applications = [
        ...(db.fundingApplications ?? []).filter((item) => !(item.shopId === application.shopId && item.programmeId === application.programmeId)),
        application,
      ];
      return { db: { ...db, fundingApplications: applications }, meta };
    }

    case "PUBLISH_FUNDING_PROGRAMME": {
      const programme = action.programme;
      if (!programme.name.trim() || !programme.provider.trim() || !/^https?:\/\//i.test(programme.officialUrl)) {
        return { db, meta: { error: "Enter a programme, provider and valid official URL" } };
      }
      return { db: { ...db, fundingProgrammes: [...(db.fundingProgrammes ?? []), { ...programme, id: uid("funding") }] }, meta };
    }

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

    case "CREATE_POOL": {
      if (!isShopVerified(db, action.shopId)) {
        return { db, meta: { error: "Shop is not verified yet" } };
      }
      const product = WHOLESALE_CATALOGUE.find((item) => item.id === action.productId);
      if (!product) return { db, meta: { error: "Choose a product from the wholesaler catalogue" } };
      const pool = {
        ...product,
        id: uid("pool"),
        supplierVerified: true,
        commitments: [],
        closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "open" as const,
        ownerShopId: null,
        ledger: [],
        balanceCents: 0,
      };
      meta.poolId = pool.id;
      return { db: { ...db, pools: [pool, ...db.pools] }, meta };
    }

    case "JOIN_POOL": {
      const shop = db.shops.find((item) => item.id === action.shopId);
      if (!shop || !isShopVerified(db, action.shopId)) {
        return { db, meta: { error: "Only verified shops can pay into a pot" } };
      }
      const pool = db.pools.find((item) => item.id === action.poolId);
      if (!pool) return { db, meta: { error: "Pot not found" } };
      if (pool.status !== "open") return { db, meta: { error: "This pot is no longer open for payments" } };
      if (!Number.isInteger(action.qty) || action.qty < 1 || action.qty > 1000) {
        return { db, meta: { error: "Enter a valid number of units" } };
      }
      if (!["instant-eft", "bank-card", "wallet"].includes(action.method)) {
        return { db, meta: { error: "Choose a supported sandbox payment method" } };
      }
      if (pool.commitments.some((member) => member.shopId === shop.id)) {
        return { db, meta: { error: "This shop has already paid into the pot" } };
      }
      const member = {
        shopId: shop.id,
        shopName: shop.name,
        township: shop.township,
        qty: action.qty,
        paid: true,
        paidCents: 0,
        joinedAt: new Date().toISOString(),
      };
      const quote = quoteJoin(pool, member);
      if (action.expectedCents !== quote.paymentCents) {
        return { db, meta: { error: "The price changed while you were paying", quoteCents: quote.paymentCents } };
      }
      const contribution = ledgerEntry(pool, {
        id: uid("entry"),
        type: "contribution",
        shopId: shop.id,
        amountCents: quote.paymentCents,
        reference: uid("KE").toUpperCase(),
        method: action.method,
      });
      member.paidCents = quote.paymentCents;
      const updatedPool = {
        ...pool,
        commitments: [...pool.commitments, member],
        ledger: [...(pool.ledger ?? []), contribution],
        balanceCents: contribution.balanceCents,
        ownerShopId: pool.ownerShopId ?? shop.id,
      };
      return {
        db: { ...db, pools: db.pools.map((item) => item.id === pool.id ? updatedPool : item) },
        meta: { paymentCents: quote.paymentCents, reference: contribution.reference },
      };
    }

    case "CLOSE_POOL": {
      const pool = db.pools.find((item) => item.id === action.poolId);
      if (!pool) return { db, meta: { error: "Pot not found" } };
      if (pool.ownerShopId !== action.shopId) return { db, meta: { error: "Only the shop that opened this pot can close it" } };
      if (pool.status !== "open") return { db, meta: { error: "This pot is not open" } };
      if (totalPoolQty(pool) < pool.minQty) return { db, meta: { error: "The minimum order has not been reached" } };
      const shares = quoteForMembers(pool, pool.commitments);
      const entries = [...(pool.ledger ?? [])];
      let settledPool = pool;
      const append = (entry: Parameters<typeof ledgerEntry>[1]) => {
        const next = ledgerEntry(settledPool, entry);
        entries.push(next);
        settledPool = { ...settledPool, ledger: entries, balanceCents: next.balanceCents };
      };
      for (const share of shares) {
        const member = pool.commitments.find((item) => item.shopId === share.shopId)!;
        const credit = (member.paidCents ?? 0) - share.totalCents;
        if (credit < 0) return { db, meta: { error: `${member.shopName} still owes money; the pot cannot close` } };
        if (credit > 0) append({
          id: uid("entry"),
          type: "rebate",
          shopId: member.shopId,
          amountCents: -credit,
          reference: uid("KE").toUpperCase(),
        });
      }
      const finalUnitPrice = priceForQty(pool, totalPoolQty(pool));
      append({
        id: uid("entry"),
        type: "wholesaler",
        amountCents: -totalPoolQty(pool) * finalUnitPrice,
        reference: uid("KE").toUpperCase(),
      });
      append({
        id: uid("entry"),
        type: "driver",
        amountCents: -(pool.deliveryCents ?? 0),
        reference: uid("KE").toUpperCase(),
      });
      append({
        id: uid("entry"),
        type: "service-fee",
        amountCents: -shares.reduce((sum, share) => sum + share.feeCents, 0),
        reference: uid("KE").toUpperCase(),
      });
      if (settledPool.balanceCents !== 0) return { db, meta: { error: "Pot settlement did not balance to zero" } };
      settledPool = { ...settledPool, status: "delivering" };
      const audit = auditPot(settledPool);
      if (!audit.valid) return { db, meta: { error: `Pot audit failed: ${audit.errors.join("; ")}` } };
      return { db: { ...db, pools: db.pools.map((item) => item.id === pool.id ? settledPool : item) }, meta };
    }

    case "CANCEL_POOL": {
      const pool = db.pools.find((item) => item.id === action.poolId);
      if (!pool) return { db, meta: { error: "Pot not found" } };
      if (pool.ownerShopId !== action.shopId) return { db, meta: { error: "Only the shop that opened this pot can cancel it" } };
      if (pool.status !== "open") return { db, meta: { error: "This pot is not open" } };
      if (totalPoolQty(pool) >= pool.minQty) return { db, meta: { error: "The minimum has been reached; this pot can no longer be cancelled" } };
      const entries = [...(pool.ledger ?? [])];
      let settledPool = pool;
      for (const member of pool.commitments) {
        const refund = member.paidCents ?? 0;
        if (refund === 0) continue;
        const entry = ledgerEntry(settledPool, {
          id: uid("entry"),
          type: "refund",
          shopId: member.shopId,
          amountCents: -refund,
          reference: uid("KE").toUpperCase(),
        });
        entries.push(entry);
        settledPool = { ...settledPool, ledger: entries, balanceCents: entry.balanceCents };
      }
      if (settledPool.balanceCents !== 0) return { db, meta: { error: "Refunds did not balance to zero" } };
      settledPool = { ...settledPool, status: "closed" };
      const audit = auditPot(settledPool);
      if (!audit.valid) return { db, meta: { error: `Pot audit failed: ${audit.errors.join("; ")}` } };
      return { db: { ...db, pools: db.pools.map((item) => item.id === pool.id ? settledPool : item) }, meta };
    }

    case "COMPLETE_POOL_DELIVERY": {
      const pool = db.pools.find((item) => item.id === action.poolId);
      if (!pool) return { db, meta: { error: "Pot not found" } };
      if (pool.ownerShopId !== action.shopId) return { db, meta: { error: "Only the shop that opened this pot can confirm delivery" } };
      if (pool.status !== "delivering") return { db, meta: { error: "This pot is not awaiting delivery" } };
      return {
        db: { ...db, pools: db.pools.map((item) => item.id === pool.id ? { ...item, status: "delivered" } : item) },
        meta,
      };
    }

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

    case "SEND_OFFER": {
      const thread = db.threads.find((item) => item.id === action.threadId);
      const giver = db.shops.find((item) => item.id === action.fromShopId);
      const receiverId = thread && (thread.shopAId === action.fromShopId ? thread.shopBId : thread.shopAId);
      const receiver = receiverId && db.shops.find((item) => item.id === receiverId);
      const giveGood = db.goods.find((item) => item.id === action.giveGoodId && item.shopId === action.fromShopId);
      const receiveGood = db.goods.find((item) => item.id === action.receiveGoodId && item.shopId === receiverId);
      if (!thread || thread.status !== "open" || !giver || !receiver) return { db, meta: { error: "Exchange conversation is unavailable" } };
      if (!isShopVerified(db, giver.id) || !isShopVerified(db, receiver.id)) return { db, meta: { error: "Both shops must be verified to make an offer" } };
      if (!giveGood || !receiveGood) return { db, meta: { error: "Choose goods listed in this exchange" } };
      if (!Number.isInteger(action.giveQty) || !Number.isInteger(action.receiveQty) ||
          action.giveQty < 1 || action.receiveQty < 1 ||
          giveGood.stockQty < action.giveQty || receiveGood.stockQty < action.receiveQty) {
        return { db, meta: { error: "Offer quantities exceed available stock" } };
      }
      const giveValueCents = Math.round(giveGood.price * 100) * action.giveQty;
      const receiveValueCents = Math.round(receiveGood.price * 100) * action.receiveQty;
      const difference = giveValueCents - receiveValueCents;
      const cashAdjustment = Math.round(difference / 100);
      return {
        db: {
          ...db,
          threads: db.threads.map((t) =>
            t.id === action.threadId
              ? {
                  ...t,
                  offers: [
                    ...t.offers.map((offer) => offer.status === "pending" ? { ...offer, status: "declined" as const } : offer),
                    {
                      id: uid("offer"),
                      fromShopId: action.fromShopId,
                      offerGive: `${action.giveQty} × ${giveGood.name}`,
                      offerReceive: `${action.receiveQty} × ${receiveGood.name}`,
                      cashAdjustment,
                      giveValueCents,
                      receiveValueCents,
                      status: "pending",
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : t
          ),
        },
        meta: { giveValueCents, receiveValueCents, cashAdjustment },
      };
    }

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
