"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { OrderStatus } from "@/lib/types";
import { formatRand } from "@/lib/pricing";
import {
  ArrowLeft,
  Phone,
  Truck,
  ShoppingBag,
  Banknote,
  CreditCard,
  StickyNote,
  CheckCircle2,
  XCircle,
  Receipt,
} from "lucide-react";
import clsx from "clsx";

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  placed: { label: "Accept order", next: "accepted" },
  accepted: { label: "Mark ready", next: "ready" },
  ready: { label: "Mark collected", next: "collected" },
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  placed: "bg-ember/10 text-ember-dark",
  accepted: "bg-blue-100 text-blue-700",
  ready: "bg-leaf/10 text-leaf",
  collected: "bg-sand-100 text-ink/50",
  rejected: "bg-red-100 text-red-600",
};

const TIMELINE: OrderStatus[] = ["placed", "accepted", "ready", "collected"];

const TIMELINE_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: "Order placed",
  accepted: "Accepted by the shop",
  ready: "Ready for the customer",
  collected: "Collected / handed over",
};

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { state, dispatch } = useStore();
  const [error, setError] = useState<string | null>(null);

  const shop = state.shops.find((s) => s.id === state.myShopId);
  const order = state.orders.find((o) => o.id === params.orderId);

  // a missing order, or another shop's order, is simply not found here
  if (!order || !shop || order.shopId !== shop.id) return notFound();

  const stepIndex = TIMELINE.indexOf(order.status); // -1 when rejected
  const action = NEXT_ACTION[order.status];
  const orderId = order.id;
  const payout = order.total - order.platformFee;

  async function setStatus(status: OrderStatus) {
    const meta = await dispatch({ type: "SET_ORDER_STATUS", orderId, status });
    setError(meta?.error ?? null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/owner/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Order from {order.consumerName}</h1>
          <p className="text-sm text-ink/50">
            <Receipt size={12} className="mr-1 inline" />
            {order.id} ·{" "}
            {new Date(order.createdAt).toLocaleString("en-ZA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
            STATUS_STYLE[order.status]
          )}
        >
          {order.status}
        </span>
      </div>

      {/* ---- itemised purchase record ---- */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink">What was bought</h2>
        <div className="mt-3 space-y-2 border-t border-ink/5 pt-3 text-sm">
          {order.items.map((it) => (
            <div key={it.goodId} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-ink/70">
                <span className="font-semibold text-ink">{it.qty} ×</span> {it.name}
                <span className="block text-xs text-ink/40">
                  {formatRand(it.price)} / {it.unit}
                </span>
              </span>
              <span className="shrink-0 font-medium text-ink">{formatRand(it.qty * it.price)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 border-t border-ink/5 pt-3 text-sm">
          <div className="flex justify-between text-ink/60">
            <span>Subtotal</span>
            <span>{formatRand(order.total)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Kasi-Connect platform fee (3%)</span>
            <span>− {formatRand(order.platformFee)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>You receive</span>
            <span className="font-semibold text-leaf">{formatRand(payout)}</span>
          </div>
          <div className="flex justify-between border-t border-ink/5 pt-2 text-base font-bold text-ink">
            <span>Customer pays</span>
            <span>{formatRand(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ---- customer & fulfilment ---- */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink">Customer &amp; fulfilment</h2>
        <div className="mt-3 space-y-2.5 border-t border-ink/5 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink/50">Customer</span>
            <span className="font-medium text-ink">{order.consumerName}</span>
          </div>
          {order.consumerPhone && (
            <div className="flex items-center justify-between">
              <span className="text-ink/50">Phone</span>
              <a
                href={`tel:${order.consumerPhone.replace(/\s+/g, "")}`}
                className="flex items-center gap-1 font-medium text-ink hover:text-ember-dark"
              >
                <Phone size={13} /> {order.consumerPhone}
              </a>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-ink/50">
              {order.fulfilment === "delivery" ? <Truck size={13} /> : <ShoppingBag size={13} />}
              Fulfilment
            </span>
            <span className="font-medium capitalize text-ink">{order.fulfilment}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-ink/50">
              {order.payment === "cash" ? <Banknote size={13} /> : <CreditCard size={13} />}
              Payment
            </span>
            <span className="font-medium text-ink">
              {order.payment === "cash"
                ? `Cash on ${order.fulfilment === "pickup" ? "pickup" : "delivery"}`
                : "Paid online"}
            </span>
          </div>
          {order.note && (
            <div className="flex items-start justify-between gap-3">
              <span className="flex shrink-0 items-center gap-1 text-ink/50">
                <StickyNote size={13} /> Note
              </span>
              <p className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink/60">{order.note}</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- status timeline / rejection notice ---- */}
      {order.status === "rejected" ? (
        <div className="card flex items-center gap-3 p-5 text-sm font-medium text-red-600">
          <XCircle size={18} /> This order was rejected — no stock was reserved.
        </div>
      ) : (
        <div className="card p-5">
          <h2 className="font-semibold text-ink">Progress</h2>
          <div className="mt-3 space-y-3 border-t border-ink/5 pt-3">
            {TIMELINE.map((step, i) => {
              const done = stepIndex >= i;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      done ? "bg-leaf text-white" : "bg-sand-100 text-ink/30"
                    )}
                  >
                    <CheckCircle2 size={15} />
                  </div>
                  <span className={clsx("text-sm", done ? "font-medium text-ink" : "text-ink/40")}>
                    {TIMELINE_LABEL[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
      )}

      {action && (
        <div className="flex gap-2">
          <button onClick={() => setStatus(action.next)} className="btn-dark flex-1 py-3 text-sm">
            {action.label}
          </button>
          {order.status === "placed" && (
            <button onClick={() => setStatus("rejected")} className="btn-outline px-4 py-3 text-sm">
              Reject
            </button>
          )}
        </div>
      )}

      {order.status === "collected" && (
        <p className="text-center text-sm text-ink/45">
          This order is complete — the customer paid {formatRand(order.total)} and you keep{" "}
          {formatRand(payout)}.
        </p>
      )}
    </div>
  );
}
